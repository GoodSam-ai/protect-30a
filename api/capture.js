// api/capture.js — Protect30A one-way public intake (Vercel Node serverless function)
// -----------------------------------------------------------------------------
// PURPOSE
//   Accept form submissions from the PUBLIC and hand them to the site owner's
//   store. This endpoint is ONE-WAY (public -> owner). It is operated by a
//   PRIVATE CITIZEN advocacy site and MUST NOT be presented, described, or used
//   as an official government intake channel of any kind.
//
// COMPLIANCE / POSTURE
//   - Private-citizen advocacy site. Additive, Sunshine-safe, FS Ch. 119 posture.
//   - Never echo submitted field VALUES back to the client and never log PII.
//   - Sensitive keys (ssn, dob, street address, phone, etc.) are hard-rejected.
//
// TODO (deploy): wire a durable store (Vercel KV or Postgres) via env vars;
//   add FS Ch.119 retention + moderation; add a real rate limiter.
// -----------------------------------------------------------------------------

// Per-formType allowlist of accepted field keys. Anything not listed is dropped.
const FORM_FIELD_ALLOWLIST = {
  pledge: ["first", "neighborhood", "consentPublic"],
  rsvp: ["first", "email", "hearingId", "hearingTitle", "consentReminder"],
  signup: ["email", "consent"],
  "flood-report": ["location", "description", "photoUrl", "email", "consent"],
  story: ["neighborhood", "observation", "photoUrl"],
};

const ALLOWED_FORM_TYPES = Object.keys(FORM_FIELD_ALLOWLIST);

// Keys that must NEVER be accepted, regardless of formType. If any appear in the
// payload we reject the whole request — a client sending these is malformed or
// hostile, and we prefer to fail loudly rather than silently drop.
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
];

// --- Best-effort in-memory rate limit ---------------------------------------
// NOTE: serverless instances are ephemeral and NOT shared, so this is a soft
// speed bump only — NOT a security control. A real distributed limiter (e.g.
// Vercel KV / Upstash sliding window) must be wired at deploy time.
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
// Vercel usually pre-parses JSON into req.body; fall back to manual read.
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

module.exports = async function handler(req, res) {
  // 1) Method enforcement
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // 2) Best-effort soft rate limit (see caveat above)
  if (rateLimited(clientKey(req))) {
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  // 3) Parse body
  const body = await readJsonBody(req);
  if (body === null || typeof body !== "object") {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  // 4) Honeypot: if tripped, pretend success without persisting.
  if (isHoneypotTripped(body)) {
    return res.status(200).json({ ok: true, formType: null, receivedCount: 0 });
  }

  // 5) Validate formType against allowlist
  const { formType, fields } = body;
  if (typeof formType !== "string" || !ALLOWED_FORM_TYPES.includes(formType)) {
    return res.status(400).json({ ok: false, error: "invalid_formType" });
  }
  if (fields === null || typeof fields !== "object" || Array.isArray(fields)) {
    return res.status(400).json({ ok: false, error: "invalid_fields" });
  }

  // 6) Hard-reject sensitive keys anywhere in the payload (case-insensitive).
  const incomingKeys = Object.keys(fields);
  const sensitiveHit = incomingKeys.some((k) =>
    SENSITIVE_KEYS.includes(k.toLowerCase())
  );
  if (sensitiveHit) {
    // Do NOT name which key — avoid leaking anything about the payload.
    return res.status(422).json({ ok: false, error: "sensitive_field_rejected" });
  }

  // 7) Whitelist accepted keys for this formType; drop everything else.
  const allowed = FORM_FIELD_ALLOWLIST[formType];
  let receivedCount = 0;
  for (const key of allowed) {
    const v = fields[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      receivedCount += 1;
    }
  }

  // 8) In THIS Phase-0 branch: DO NOT persist. Validate only.
  //    (No datastore, no secrets required here — see deploy TODO at top.)
  //    NEVER include field VALUES / PII in the response or any log line.

  return res.status(200).json({ ok: true, formType, receivedCount });
};

// Also expose as an ES default for environments that prefer it.
module.exports.default = module.exports;
