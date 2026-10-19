import Link from "next/link";
import { redirect } from "next/navigation";
import { canAdmin, getCurrentUserAndProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export default async function CorrespondencePage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!canAdmin(profile)) redirect("/live");
  const admin = createSupabaseAdminClient();
  const [cases, events] = await Promise.all([
    admin.from("correspondence_cases").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("correspondence_events").select("*").order("occurred_at", { ascending: false }).limit(100)
  ]);
  if (cases.error || events.error) throw new Error("Correspondence data unavailable");
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
    <Link href="/admin">← Admin</Link>
    <h1 className="font-serif text-3xl font-bold">Correspondence tracker</h1>
    <p>Private administrator view. Delivery confirms mail-server acceptance; acknowledgment and council action require reviewed evidence.</p>
    {!process.env.RESEND_WEBHOOK_SECRET && <p role="alert" className="rounded border border-amber-600 bg-amber-50 p-4">Automatic event capture is disabled: the webhook signing secret must be configured. Existing statuses below were independently verified.</p>}
    <p>Forward replies from iCloud to correspondence@inbox.protect30a.org. Retain the case reference in the subject. Received notices require review and do not establish a commitment.</p>
    {(cases.data ?? []).map(row => <section key={row.reference} className="space-y-3 rounded border p-5">
      <h2 className="text-xl font-semibold">{row.title}</h2>
      <p>{row.reference} · {row.recipient}</p>
      <dl className="grid gap-2 sm:grid-cols-2">
        <dt>Delivery</dt><dd>{(events.data ?? []).find(event => event.provider_email_id === row.provider_email_id && ["email.delivered", "email.bounced", "email.failed", "email.delivery_delayed"].includes(event.event_type))?.event_type.replace("email.", "") ?? row.delivery_status}</dd>
        <dt>Acknowledgment</dt><dd>{row.acknowledged_at ?? "Pending — not confirmed"}</dd>
        <dt>Council consideration</dt><dd>{row.council_status}</dd>
        <dt>30-day direction adopted</dt><dd>{row.direction_adopted_at ?? "Not confirmed; reporting clock has not started"}</dd>
      </dl>
      <p>{row.notes}</p>
      <details><summary>Meeting follow-up checklist</summary><ul className="list-disc space-y-2 pl-5"><li>Confirm receipt and inclusion in the public record.</li><li>Record the responsible staff contact and consideration date.</li><li>Capture the exact motion, vote, and any promised follow-up.</li><li>Request written confirmation and supporting minutes or recording.</li></ul></details>
    </section>)}
    <h2 className="text-xl font-semibold">Delivery and received-reply notices</h2>
    <p>Event metadata only. Email text is untrusted and never triggers automated actions.</p>
    <ul className="space-y-3">{(events.data ?? []).map(row => <li key={row.id} className="rounded border p-3"><strong>{row.event_type}</strong> · {new Date(row.occurred_at).toLocaleString("en-US", { timeZone: "America/Chicago" })} Central<p>{row.subject ?? row.provider_email_id}</p></li>)}</ul>
    <p className="text-sm">Provenance: Resend delivery records and reviewed submission data. Times shown in U.S. Central.</p>
  </main>;
}
