import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionCenterDbMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  from: vi.fn(),
  insert: vi.fn()
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: actionCenterDbMocks.createSupabaseAdminClient
}));

const captureRoutePath = resolve(process.cwd(), "app/api/capture/route.ts");
const pledgeRoutePath = resolve(process.cwd(), "app/api/pledge/route.ts");

function jsonRequest(body: unknown) {
  return new Request("https://protect30a.test/api/action-center", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function request(method: string, body?: BodyInit | null, forwardedFor?: string) {
  return new Request("https://protect30a.test/api/action-center", {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {})
    },
    body
  });
}

function requestWithHeaders(
  method: string,
  body: BodyInit | null,
  headers: Record<string, string>
) {
  return new Request("https://protect30a.test/api/action-center", {
    method,
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body
  });
}

async function capturePost(request: Request) {
  const route = await import(pathToFileURL(captureRoutePath).href);
  return route.POST(request) as Promise<Response>;
}

async function pledgePost(request: Request) {
  const route = await import(pathToFileURL(pledgeRoutePath).href);
  return route.POST(request) as Promise<Response>;
}

async function captureRequest(request: Request) {
  const route = await import(pathToFileURL(captureRoutePath).href);
  const handler = route[request.method] as ((request: Request) => Promise<Response>) | undefined;
  return handler?.(request);
}

async function pledgeRequest(request: Request) {
  const route = await import(pathToFileURL(pledgeRoutePath).href);
  const handler = route[request.method] as ((request: Request) => Promise<Response>) | undefined;
  return handler?.(request);
}

describe("Action Center API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionCenterDbMocks.insert.mockResolvedValue({ error: null });
    actionCenterDbMocks.from.mockReturnValue({
      insert: actionCenterDbMocks.insert
    });
    actionCenterDbMocks.createSupabaseAdminClient.mockReturnValue({
      from: actionCenterDbMocks.from
    });
  });

  it("keeps the capture endpoint's safe RSVP contract", async () => {
    expect(existsSync(captureRoutePath)).toBe(true);

    const response = await capturePost(
      jsonRequest({
        formType: "rsvp",
        fields: {
          hearingId: "meeting",
          hearingTitle: "Public meeting",
          first: "Sam",
          email: "sam@example.com",
          consentReminder: true
        }
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      formType: "rsvp",
      receivedCount: 5
    });
    expect(actionCenterDbMocks.createSupabaseAdminClient).toHaveBeenCalledOnce();
    expect(actionCenterDbMocks.from).toHaveBeenCalledWith(
      "action_center_submissions"
    );
    expect(actionCenterDbMocks.insert).toHaveBeenCalledWith({
      form_type: "rsvp",
      fields: {
        hearingId: "meeting",
        hearingTitle: "Public meeting",
        first: "Sam",
        email: "sam@example.com",
        consentReminder: true
      }
    });
  });

  it("rejects incomplete RSVP submissions before persistence", async () => {
    const response = await capturePost(
      jsonRequest({
        formType: "rsvp",
        fields: {
          hearingId: "meeting",
          first: "",
          email: "not-an-email",
          consentReminder: false
        }
      })
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      error: "validation_failed"
    });
    expect(actionCenterDbMocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rejects invalid newsletter signups before persistence", async () => {
    const response = await capturePost(
      jsonRequest({
        formType: "signup",
        fields: { email: "not-an-email", consent: false }
      })
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      error: "validation_failed"
    });
    expect(actionCenterDbMocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("requires pledges to use the records-consent pledge endpoint", async () => {
    const response = await capturePost(
      jsonRequest({
        formType: "pledge",
        fields: {
          first: "Sam",
          neighborhood: "Seagrove",
          consentPublic: true
        }
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_formType"
    });
    expect(actionCenterDbMocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it.each([
    {
      formType: "flood-report",
      fields: {
        location: "Seagrove",
        description: "Standing water near the intersection.",
        consent: true
      }
    },
    {
      formType: "story",
      fields: {
        neighborhood: "Seagrove",
        observation: "Standing water remained after the storm."
      }
    }
  ])("does not expand durable intake to $formType", async ({ formType, fields }) => {
    const response = await capturePost(jsonRequest({ formType, fields }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_formType"
    });
    expect(actionCenterDbMocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("does not report success when capture persistence fails", async () => {
    actionCenterDbMocks.insert.mockResolvedValue({
      error: new Error("database unavailable")
    });

    const response = await capturePost(
      jsonRequest({
        formType: "signup",
        fields: { email: "sam@example.com", consent: true }
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "submission_unavailable"
    });
  });

  it("rejects sensitive pledge fields without returning submitted values", async () => {
    expect(existsSync(pledgeRoutePath)).toBe(true);

    const response = await pledgePost(
      jsonRequest({ first: "Sam", consentRecords: true, email: "sam@example.com" })
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      error: "sensitive_field_rejected"
    });
  });

  it("silently accepts capture honeypots without exposing the submitted values", async () => {
    const response = await capturePost(
      jsonRequest({ website: "https://spam.example", formType: "pledge", fields: { first: "Sam" } })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, formType: null, receivedCount: 0 });
  });

  it("rejects sensitive capture fields case-insensitively", async () => {
    const response = await capturePost(
      jsonRequest({ formType: "rsvp", fields: { first: "Sam", PHONE: "555-555-5555" } })
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, error: "sensitive_field_rejected" });
  });

  it("drops unknown capture fields while counting only allowed non-empty fields", async () => {
    const response = await capturePost(
      jsonRequest({
        formType: "signup",
        fields: { email: "sam@example.com", consent: true, ignored: "value" }
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, formType: "signup", receivedCount: 2 });
  });

  it("reports capture validation errors without echoing input", async () => {
    const malformed = await capturePost(request("POST", "{"));
    const invalidForm = await capturePost(jsonRequest({ formType: "unknown", fields: {} }));
    const invalidFields = await capturePost(jsonRequest({ formType: "rsvp", fields: [] }));

    expect(await malformed.json()).toEqual({ ok: false, error: "invalid_json" });
    expect(await invalidForm.json()).toEqual({ ok: false, error: "invalid_formType" });
    expect(await invalidFields.json()).toEqual({ ok: false, error: "invalid_fields" });
  });

  it("keeps capture's legacy empty-body and top-level-array parsing semantics", async () => {
    const empty = await capturePost(request("POST"));
    const array = await capturePost(request("POST", JSON.stringify([])));

    expect(await empty.json()).toEqual({ ok: false, error: "invalid_formType" });
    expect(await array.json()).toEqual({ ok: false, error: "invalid_formType" });
  });

  it("keeps pledge's legacy empty-body and top-level-array parsing semantics", async () => {
    const empty = await pledgePost(request("POST"));
    const array = await pledgePost(request("POST", JSON.stringify([])));

    expect(await empty.json()).toEqual({ ok: false, error: "records_consent_required" });
    expect(await array.json()).toEqual({ ok: false, error: "invalid_json" });
  });

  it("rejects oversized capture and pledge JSON bodies", async () => {
    const oversized = "x".repeat(100 * 1024);
    const capture = await capturePost(
      request(
        "POST",
        JSON.stringify({ formType: "signup", fields: { consent: true, ignored: oversized } })
      )
    );
    const pledge = await pledgePost(
      request("POST", JSON.stringify({ consentRecords: true, ignored: oversized }))
    );

    expect(await capture.json()).toEqual({ ok: false, error: "invalid_json" });
    expect(await pledge.json()).toEqual({ ok: false, error: "invalid_json" });
  });

  it("enforces capture's POST-only method contract", async () => {
    const response = await captureRequest(request("GET"));

    expect(response).toBeDefined();
    expect(response?.status).toBe(405);
    expect(response?.headers.get("Allow")).toBe("POST");
    await expect(response?.json()).resolves.toEqual({ ok: false, error: "method_not_allowed" });
  });

  it("limits capture to twenty requests per client each minute", async () => {
    const client = "198.51.100.10";
    const requests = Array.from({ length: 21 }, () =>
      capturePost(
        request(
          "POST",
          JSON.stringify({
            formType: "signup",
            fields: { email: "sam@example.com", consent: true }
          }),
          client
        )
      )
    );
    const responses = await Promise.all(requests);

    expect(responses.slice(0, 20).every((response) => response.status === 200)).toBe(true);
    expect(responses[20].status).toBe(429);
    expect(await responses[20].json()).toEqual({ ok: false, error: "rate_limited" });
  });

  it("returns the saved pledge count and only consented public names", async () => {
    const countEq = vi.fn().mockResolvedValue({
      count: 3,
      error: null
    });
    const countSelect = vi.fn().mockReturnValue({ eq: countEq });
    const publicLimit = vi.fn().mockResolvedValue({
      data: [
        {
          fields: {
            first: "Sam",
            neighborhood: "Seagrove",
            consentPublic: true,
            consentRecords: true
          }
        }
      ],
      error: null
    });
    const publicOrder = vi.fn().mockReturnValue({ limit: publicLimit });
    const publicContains = vi.fn().mockReturnValue({ order: publicOrder });
    const publicEq = vi.fn().mockReturnValue({ contains: publicContains });
    const publicSelect = vi.fn().mockReturnValue({ eq: publicEq });
    actionCenterDbMocks.from
      .mockReturnValueOnce({ select: countSelect })
      .mockReturnValueOnce({ select: publicSelect });

    const response = await pledgeRequest(request("GET"));

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toEqual({
      ok: true,
      count: 3,
      recent: [{ first: "Sam", neighborhood: "Seagrove" }]
    });
    expect(countSelect).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true
    });
    expect(publicContains).toHaveBeenCalledWith("fields", {
      consentPublic: true
    });
  });

  it("silently accepts pledge honeypots before consent validation", async () => {
    const response = await pledgePost(jsonRequest({ company_website: "spam.example" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("requires explicit records consent for a pledge", async () => {
    const missing = await pledgePost(jsonRequest({ first: "Sam" }));
    const falseConsent = await pledgePost(jsonRequest({ consentRecords: false }));

    expect(await missing.json()).toEqual({ ok: false, error: "records_consent_required" });
    expect(await falseConsent.json()).toEqual({
      ok: false,
      error: "records_consent_required"
    });
  });

  it("drops unknown pledge fields before persisting the submission", async () => {
    const response = await pledgePost(
      jsonRequest({ consentRecords: true, first: "Sam", unexpected: "not retained" })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(actionCenterDbMocks.insert).toHaveBeenCalledWith({
      form_type: "pledge",
      fields: {
        first: "Sam",
        consentRecords: true
      }
    });
  });

  it("reports pledge invalid JSON without submitted values", async () => {
    const response = await pledgePost(request("POST", "{"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_json" });
  });

  it("enforces pledge's GET and POST method contract", async () => {
    const response = await pledgeRequest(request("PUT"));

    expect(response).toBeDefined();
    expect(response?.status).toBe(405);
    expect(response?.headers.get("Allow")).toBe("GET, POST");
    await expect(response?.json()).resolves.toEqual({ ok: false, error: "method_not_allowed" });
  });

  it("limits pledges to twenty requests per client each minute", async () => {
    const client = "198.51.100.11";
    const requests = Array.from({ length: 21 }, () =>
      pledgePost(
        request(
          "POST",
          JSON.stringify({ first: "Sam", consentRecords: true }),
          client
        )
      )
    );
    const responses = await Promise.all(requests);

    expect(responses.slice(0, 20).every((response) => response.status === 200)).toBe(true);
    expect(responses[20].status).toBe(429);
    expect(await responses[20].json()).toEqual({ ok: false, error: "rate_limited" });
  });

  it("uses x-real-ip when x-forwarded-for is unavailable", async () => {
    const requests = Array.from({ length: 21 }, () =>
      capturePost(
        requestWithHeaders(
          "POST",
          JSON.stringify({
            formType: "signup",
            fields: { email: "sam@example.com", consent: true }
          }),
          { "x-real-ip": "198.51.100.12" }
        )
      )
    );
    const responses = await Promise.all(requests);

    expect(responses.slice(0, 20).every((response) => response.status === 200)).toBe(true);
    expect(responses[20].status).toBe(429);
    expect(await responses[20].json()).toEqual({ ok: false, error: "rate_limited" });
  });

  it("does not share a rate-limit bucket when no client identity is forwarded", async () => {
    const requests = Array.from({ length: 21 }, () =>
      capturePost(
        request(
          "POST",
          JSON.stringify({
            formType: "signup",
            fields: { email: "sam@example.com", consent: true }
          })
        )
      )
    );
    const responses = await Promise.all(requests);

    expect(responses.every((response) => response.status === 200)).toBe(true);
  });

  it("does not treat an unknown forwarded identity as a shared client", async () => {
    const requests = Array.from({ length: 21 }, () =>
      capturePost(
        requestWithHeaders(
          "POST",
          JSON.stringify({
            formType: "signup",
            fields: { email: "sam@example.com", consent: true }
          }),
          { "x-forwarded-for": "unknown" }
        )
      )
    );
    const responses = await Promise.all(requests);

    expect(responses.every((response) => response.status === 200)).toBe(true);
  });
});
