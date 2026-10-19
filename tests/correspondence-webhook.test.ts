import { beforeEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "svix";
import { POST } from "@/app/api/correspondence/webhook/route";

const mocks = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ from: () => ({ upsert: mocks.upsert }) })
}));
const secret = `whsec_${Buffer.from("test-secret-for-signature-checks").toString("base64")}`;
function request(payload: string, signed = true) {
  const timestamp = new Date();
  const id = "msg_test_delivery";
  return new Request("https://example.com/api/correspondence/webhook", {
    method: "POST", body: payload,
    headers: { "svix-id": id, "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signed ? new Webhook(secret).sign(id, timestamp, payload) : "invalid" }
  });
}
describe("correspondence webhook", () => {
  beforeEach(() => { vi.stubEnv("RESEND_WEBHOOK_SECRET", secret); mocks.upsert.mockReset(); mocks.upsert.mockResolvedValue({ error: null }); });
  it("fails closed without a signing secret", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    expect((await POST(request("{}"))).status).toBe(503);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("rejects forged events", async () => {
    expect((await POST(request("{}", false))).status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("stores signed events idempotently without upgrading acknowledgment", async () => {
    const body = JSON.stringify({ type: "email.delivered", created_at: "2026-10-19T15:25:00Z", data: { email_id: "email_123", from: "Doug <doug@protect30a.org>", to: ["clerk@example.com"] } });
    expect((await POST(request(body))).status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "msg_test_delivery", event_type: "email.delivered", provider_email_id: "email_123" }), { onConflict: "id", ignoreDuplicates: true });
    expect(mocks.upsert.mock.calls[0][0]).not.toHaveProperty("acknowledged_at");
  });
  it("returns a retryable failure on database error", async () => {
    mocks.upsert.mockResolvedValue({ error: { message: "unavailable" } });
    const body = JSON.stringify({ type: "email.delivered", created_at: "2026-10-19T15:25:00Z", data: { email_id: "email_123", from: "doug@protect30a.org" } });
    expect((await POST(request(body))).status).toBe(503);
  });
});
