// api/pledge.js — Protect30A pledge intake + read-back (Vercel Node serverless function)
// -----------------------------------------------------------------------------
// PURPOSE
//   Handle the neighbor "pledge" feature for a PRIVATE CITIZEN advocacy site.
//     - GET  -> return a public "pledge wall" count + a small moderated recent list.
//     - POST -> accept a single voluntary pledge submission (one-way, public -> owner).
//   This endpoint is ONE-WAY (public -> owner store). It is operated by a PRIVATE
//   CITIZEN and MUST NOT be presented, described, or used as an official government
//   intake channel of any kind. The pledge is voluntary civic engagement, NOT an
//   official government form.
//
//   This lives separately from api/capture.js (the validate-only Phase 0 intake)
//   because the pledge feature needs a READ-BACK count/wall (GET), which capture
//   deliberately does not provide.
//
// COMPLIANCE / POSTURE
//   - Private-citizen advocacy site. Additive, Sunshine-safe, FS Ch. 119 posture.
//   - Never echo submitted field VALUES back to the client and never log PII.
//   - Sensitive keys (ssn, dob, street address, phone, email, etc.) are hard-rejected.
//   - Only MODERATED, CONSENTED first-name + neighborhood may ever appear in `recent`.
//
// TODO (deploy) — must be done before this endpoint persists or serves real data:
//   1) Wire a DURABLE STORE (Vercel KV or Postgres) via env vars; do NOT hardcode
//      any secret/credential in code.
//   2) FS Ch. 119 RETENTION: define + document a retention/disposition schedule for
//      pledge records held in the owner store.
//   3) MODERATION QUEUE: incoming pledges land unpublished. Only after human review
//      may a record surface publicly, and then ONLY consented first-name + neighborhood
//      may ever appear in GET `recent`. Nothing else is ever exposed.
//   4) Add a REAL DISTRIBUTED RATE LIMITER (e.g. Vercel KV / Upstash sliding window).
//      The in-memory limiter below is an ephemeral soft speed bump, NOT a real limiter.
//   5) Keep the endpoint ONE-WAY (public -> owner store) and never frame it as an
//      official government channel.
// -----------------------------------------------------------------------------

// The ONLY four keys a pledge POST may carry. Everything else is dropped.
const PLEDGE_ALLOWLIST = ["first", "neighborhood", "consentPublic", "consentRecords"];

// Keys that must NEVER be accepted. If any appear (case-insensitive), reject the
// whole request — a client sending these is malformed or hostile, and we prefer to
// fail loudly rather than silently drop. Never name which key was the offender.
const SENSITIVE_KEYS = [
  "ssn",
  "socialsecurity",
  "social_security",
  "dob",
  "dateofbirth",
  "date_of_birth",
  "birthdate",
  "address",
  "street",
  "streetaddress",
  "street_address",
  "addressline1",
  "address1",
  "phone",
  "phonenumber",
  "phone_number",
  "mobile",
  "tel",
  "email",
  "emailaddress",
  "email_address",
  "e_mail",
];

// --- Best-effort in-memory rate limit ---------------------------------------
// NOTE: serverless instances are ephemeral and NOT shared, so this is a soft
// speed bump only — NOT a security control. A real distributed limiter (e.g.
// Vercel KV / Upstash sliding window) must be wired at deploy time (see TODO #4).
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateBucket = new Map(); // key -> { count, resetAt }

function rateLimited(key) {
  const now = Date.now();
  const entry = rateBucket.get(key);
  if (!entry || now > entry.resetAt) {
    rateBucket.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function clientKey(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

// --- Honeypot ----------------------------------------------------------------
// Forms may include a hidden field a human never fills. If populated, treat as
// a bot and silently succeed (do not tip off the bot, do not persist).
const HONEYPOT_FIELDS = ["website", "url", "company_website", "_hp"];

function isHoneypotTripped(body) {
  if (!body || typeof body !== "object") return false;
  return HONEYPOT_FIELDS.some((k) => {
    const v = body[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

// --- Body parsing (no external deps) ----------------------------------------
// Vercel usually pre-parses JSON into req.body; fall back to manual read with a
// small size cap. Malformed JSON resolves to null so the caller can 400.
async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return await new Promise((resolve) => {
    let raw = "";
    let tooBig = false;
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100 * 1024) {
        tooBig = true;
        resolve(null);
      }
    });
    req.on("end", () => {
      if (tooBig) return;
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

// --- GET: pledge wall (count + recent) --------------------------------------
function handleGet(req, res) {
  // TODO (deploy): read count + recent (moderated, consented, first-name+neighborhood
  //   only) from a durable store (Vercel KV/Postgres).
  //
  // On THIS branch there is NO datastore, so we report HONESTLY. We do NOT
  // fabricate a count and we do NOT invent names for the wall.
  return res.status(200).json({ ok: true, count: 0, recent: [] });
}

// --- POST: submit a pledge ---------------------------------------------------
async function handlePost(req, res) {
  // 1) Best-effort soft rate limit (see caveat above / TODO #4).
  if (rateLimited(clientKey(req))) {
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  // 2) Parse body; malformed JSON -> 400.
  const body = await readJsonBody(req);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  // 3) Honeypot: if tripped, pretend success without persisting.
  if (isHoneypotTripped(body)) {
    return res.status(200).json({ ok: true });
  }

  // 4) Hard-reject sensitive keys anywhere in the payload (case-insensitive).
  //    Do NOT name which key — avoid leaking anything about the payload.
  const incomingKeys = Object.keys(body);
  const sensitiveHit = incomingKeys.some((k) =>
    SENSITIVE_KEYS.includes(k.toLowerCase())
  );
  if (sensitiveHit) {
    return res.status(422).json({ ok: false, error: "sensitive_field_rejected" });
  }

  // 5) Whitelist ONLY the four accepted keys; drop everything else. We build a
  //    clean object rather than trusting the incoming shape.
  const pledge = {};
  for (const key of PLEDGE_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      pledge[key] = body[key];
    }
  }

  // 6) Records consent is MANDATORY. Without an explicit boolean true, refuse.
  if (pledge.consentRecords !== true) {
    return res.status(422).json({ ok: false, error: "records_consent_required" });
  }

  // 7) In THIS branch: DO NOT persist. No store, no secrets required here (see the
  //    deploy TODO block at top). At deploy time this is where the pledge is written
  //    to the moderation queue in the durable owner store.
  //    NEVER include field VALUES / PII in the response or any log line.

  return res.status(200).json({ ok: true });
}

module.exports = async function handler(req, res) {
  // Method enforcement: this endpoint speaks ONLY GET and POST.
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, error: "method_not_allowed" });
};

// Also expose as an ES default for environments that prefer it.
module.exports.default = module.exports;
