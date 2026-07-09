const CAPTURE_FIELD_ALLOWLIST = {
  pledge: ["first", "neighborhood", "consentPublic"],
  rsvp: ["first", "email", "hearingId", "hearingTitle", "consentReminder"],
  signup: ["email", "consent"],
  "flood-report": ["location", "description", "photoUrl", "email", "consent"],
  story: ["neighborhood", "observation", "photoUrl"]
} as const;

const CAPTURE_FORM_TYPES = Object.keys(CAPTURE_FIELD_ALLOWLIST);

const CAPTURE_SENSITIVE_KEYS = [
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
  "tel"
];

const PLEDGE_ALLOWLIST = ["first", "neighborhood", "consentPublic", "consentRecords"];

const PLEDGE_SENSITIVE_KEYS = [
  ...CAPTURE_SENSITIVE_KEYS,
  "email",
  "emailaddress",
  "email_address",
  "e_mail"
];

const HONEYPOT_FIELDS = ["website", "url", "company_website", "_hp"];
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

type RateEntry = { count: number; resetAt: number };
type RateBucket = Map<string, RateEntry>;

const captureRateBucket: RateBucket = new Map();
const pledgeRateBucket: RateBucket = new Map();

export function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isHoneypotTripped(body: Record<string, unknown>) {
  return HONEYPOT_FIELDS.some((key) => {
    const value = body[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function hasSensitiveKey(body: Record<string, unknown>, sensitiveKeys: readonly string[]) {
  return Object.keys(body).some((key) => sensitiveKeys.includes(key.toLowerCase()));
}

function clientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0].trim() || "unknown";
}

function rateLimited(bucket: RateBucket, key: string) {
  const now = Date.now();
  const entry = bucket.get(key);

  if (!entry || now > entry.resetAt) {
    bucket.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function methodNotAllowed(allow: string) {
  return json(
    { ok: false, error: "method_not_allowed" },
    405,
    { Allow: allow }
  );
}

function isCaptureFormType(value: unknown): value is keyof typeof CAPTURE_FIELD_ALLOWLIST {
  return typeof value === "string" && CAPTURE_FORM_TYPES.includes(value);
}

function receivedCaptureFieldCount(
  fields: Record<string, unknown>,
  formType: keyof typeof CAPTURE_FIELD_ALLOWLIST
) {
  return CAPTURE_FIELD_ALLOWLIST[formType].filter((key) => {
    const value = fields[key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  }).length;
}

export async function handleCapture(request: Request) {
  if (request.method !== "POST") return methodNotAllowed("POST");

  if (rateLimited(captureRateBucket, clientKey(request))) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  const body = await readJson(request);
  if (!body) return json({ ok: false, error: "invalid_json" }, 400);

  if (isHoneypotTripped(body)) {
    return json({ ok: true, formType: null, receivedCount: 0 });
  }

  const { formType, fields } = body;
  if (!isCaptureFormType(formType)) {
    return json({ ok: false, error: "invalid_formType" }, 400);
  }
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return json({ ok: false, error: "invalid_fields" }, 400);
  }

  const recordFields = fields as Record<string, unknown>;
  if (hasSensitiveKey(recordFields, CAPTURE_SENSITIVE_KEYS)) {
    return json({ ok: false, error: "sensitive_field_rejected" }, 422);
  }

  return json({
    ok: true,
    formType,
    receivedCount: receivedCaptureFieldCount(recordFields, formType)
  });
}

export async function handlePledge(request: Request) {
  if (request.method === "GET") {
    return json({ ok: true, count: 0, recent: [] });
  }
  if (request.method !== "POST") return methodNotAllowed("GET, POST");

  if (rateLimited(pledgeRateBucket, clientKey(request))) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  const body = await readJson(request);
  if (!body) return json({ ok: false, error: "invalid_json" }, 400);

  if (isHoneypotTripped(body)) return json({ ok: true });

  if (hasSensitiveKey(body, PLEDGE_SENSITIVE_KEYS)) {
    return json({ ok: false, error: "sensitive_field_rejected" }, 422);
  }

  const pledge: Record<string, unknown> = {};
  for (const key of PLEDGE_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(body, key)) pledge[key] = body[key];
  }

  if (pledge.consentRecords !== true) {
    return json({ ok: false, error: "records_consent_required" }, 422);
  }

  return json({ ok: true });
}
