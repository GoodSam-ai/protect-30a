import { Webhook } from "svix";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("Event processing unavailable", { status: 503 });
  if (Number(request.headers.get("content-length")) > 131072) return new Response("Payload too large", { status: 413 });
  const payload = await request.text();
  if (Buffer.byteLength(payload) > 131072) return new Response("Payload too large", { status: 413 });
  let event: { type: string; created_at: string; data: { email_id: string; from?: string; to?: string[]; subject?: string } };
  const id = request.headers.get("svix-id") ?? "";
  try {
    new Webhook(secret).verify(payload, {
      "svix-id": id,
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? ""
    });
    event = JSON.parse(payload) as typeof event;
    if (!event.data?.email_id || !event.type || !Number.isFinite(Date.parse(event.created_at))) throw new Error("Invalid event");
  } catch {
    return new Response("Invalid event", { status: 400 });
  }
  const allowed = ["email.sent", "email.delivered", "email.bounced", "email.failed", "email.delivery_delayed", "email.received"];
  if (!allowed.includes(event.type)) return new Response("Ignored", { status: 200 });
  // Account-wide webhooks: retain only this project's mail, never other projects' messages.
  const addresses = [event.data.from ?? "", ...(event.data.to ?? [])];
  if (!addresses.some(address => /@(?:inbox\.)?protect30a\.org>?$/i.test(address.trim()))) return new Response("Ignored", { status: 200 });
  try {
    const { error } = await createSupabaseAdminClient().from("correspondence_events").upsert({
      id, provider_email_id: event.data.email_id, event_type: event.type,
      occurred_at: event.created_at,
      sender: event.data.from?.slice(0, 500) ?? null,
      recipients: (event.data.to ?? []).slice(0, 50),
      subject: event.data.subject?.slice(0, 1000) ?? null
    }, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    return new Response("Recorded", { status: 200 });
  } catch {
    return new Response("Event processing unavailable", { status: 503 });
  }
}
