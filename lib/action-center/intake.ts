import {
  getPublicPledgeWall,
  saveActionCenterSubmission,
  type ActionCenterFields,
  type ActionCenterFormType
} from "@/lib/action-center/storage";
import { z } from "zod";

const CAPTURE_FIELD_ALLOWLIST = {
  rsvp: ["first", "email", "hearingId", "hearingTitle", "consentReminder"],
  signup: ["email", "consent"]
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

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const optionalEmail = z
  .union([z.literal(""), z.string().trim().email().max(254)])
  .optional();
const CAPTURE_SCHEMAS = {
  rsvp: z.object({
    first: requiredText(60),
    email: optionalEmail,
    hearingId: requiredText(200),
    hearingTitle: optionalText(240),
    consentReminder: z.literal(true)
  }),
  signup: z.object({
    email: z.string().trim().email().max(254),
    consent: z.literal(true)
  })
} as const;

const PLEDGE_SCHEMA = z.object({
  first: requiredText(60),
  neighborhood: optionalText(120),
  consentPublic: z.boolean().optional(),
  consentRecords: z.literal(true)
});

const HONEYPOT_FIELDS = ["website", "url", "company_website", "_hp"];
const MAX_JSON_BODY_BYTES = 100 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

type RateEntry = { count: number; resetAt: number };
type RateBucket = Map<string, RateEntry>;

const captureRateBucket: RateBucket = new Map();
const pledgeRateBucket: RateBucket = new Map();

export function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

export async function readJson(request: Request): Promise<unknown | null> {
  try {
    if (!request.body) return {};

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        size += value.byteLength;
        if (size > MAX_JSON_BODY_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    if (size === 0) return {};

    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
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

function usableClientValue(value: string | null | undefined) {
  const candidate = value?.trim();
  return candidate && candidate.toLowerCase() !== "unknown" && !candidate.startsWith("_")
    ? candidate
    : null;
}

function firstHeaderValue(value: string | null) {
  return usableClientValue(value?.split(",")[0]);
}

function forwardedClientValue(value: string | null) {
  const match = value?.match(/(?:^|,)\s*for=(?:"?)([^;,\"]+)/i);
  return usableClientValue(match?.[1]);
}

function clientKey(request: Request) {
  return (
    firstHeaderValue(request.headers.get("x-forwarded-for")) ??
    firstHeaderValue(request.headers.get("x-vercel-forwarded-for")) ??
    firstHeaderValue(request.headers.get("x-real-ip")) ??
    firstHeaderValue(request.headers.get("cf-connecting-ip")) ??
    firstHeaderValue(request.headers.get("true-client-ip")) ??
    forwardedClientValue(request.headers.get("forwarded"))
  );
}

function rateLimited(bucket: RateBucket, key: string | null) {
  if (!key) return false;

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

function parseCaptureFields(
  formType: keyof typeof CAPTURE_SCHEMAS,
  fields: Record<string, unknown>
): ActionCenterFields | null {
  const parsed = CAPTURE_SCHEMAS[formType].safeParse(fields);
  return parsed.success ? (parsed.data as ActionCenterFields) : null;
}

function submissionUnavailable() {
  return json({ ok: false, error: "submission_unavailable" }, 503);
}

export async function handleCapture(request: Request) {
  if (request.method !== "POST") return methodNotAllowed("POST");

  if (rateLimited(captureRateBucket, clientKey(request))) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  const body = await readJson(request);
  if (body === null || typeof body !== "object") {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const recordBody = body as Record<string, unknown>;

  if (isHoneypotTripped(recordBody)) {
    return json({ ok: true, formType: null, receivedCount: 0 });
  }

  const { formType, fields } = recordBody;
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

  const validatedFields = parseCaptureFields(formType, recordFields);
  if (!validatedFields) {
    return json({ ok: false, error: "validation_failed" }, 422);
  }

  try {
    await saveActionCenterSubmission(
      formType as ActionCenterFormType,
      validatedFields
    );
  } catch {
    return submissionUnavailable();
  }

  return json({
    ok: true,
    formType,
    receivedCount: receivedCaptureFieldCount(validatedFields, formType)
  });
}

export async function handlePledge(request: Request) {
  if (request.method === "GET") {
    try {
      return json({ ok: true, ...(await getPublicPledgeWall()) });
    } catch {
      return submissionUnavailable();
    }
  }
  if (request.method !== "POST") return methodNotAllowed("GET, POST");

  if (rateLimited(pledgeRateBucket, clientKey(request))) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  const body = await readJson(request);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const recordBody = body as Record<string, unknown>;

  if (isHoneypotTripped(recordBody)) return json({ ok: true });

  if (hasSensitiveKey(recordBody, PLEDGE_SENSITIVE_KEYS)) {
    return json({ ok: false, error: "sensitive_field_rejected" }, 422);
  }

  const pledge: Record<string, unknown> = {};
  for (const key of PLEDGE_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(recordBody, key)) pledge[key] = recordBody[key];
  }

  if (pledge.consentRecords !== true) {
    return json({ ok: false, error: "records_consent_required" }, 422);
  }

  const validatedPledge = PLEDGE_SCHEMA.safeParse(pledge);
  if (!validatedPledge.success) {
    return json({ ok: false, error: "validation_failed" }, 422);
  }

  try {
    await saveActionCenterSubmission("pledge", validatedPledge.data);
  } catch {
    return submissionUnavailable();
  }

  return json({ ok: true });
}
