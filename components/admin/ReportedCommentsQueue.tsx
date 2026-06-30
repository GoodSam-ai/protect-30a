import { Flag, ShieldCheck } from "lucide-react";

export function ReportedCommentsQueue() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Flag size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Reported comments
        </h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          ["Pending", "moderation_status = pending"],
          ["Hidden", "moderation_status = hidden"],
          ["Removed", "moderation_status = removed"],
          ["Visible", "moderation_status = visible"]
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded border border-protect-sand bg-protect-cream p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-protect-ink/60">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold text-protect-teal">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2 rounded border border-protect-sand bg-white p-3 text-sm text-protect-ink/75">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-protect-terra" aria-hidden="true" />
        <p>
          Report handling is tracked through comment reports, moderation status,
          and the audit log.
        </p>
      </div>
    </div>
  );
}
