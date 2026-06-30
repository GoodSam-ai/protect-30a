import { BadgeCheck } from "lucide-react";

const badges = [
  ["First voice", "1 visible comment"],
  ["Conversation starter", "5 visible comments"],
  ["Community signal", "25 engagement points"],
  ["Podcast invite eligible", "Featured comment or 25+ points"]
];

export function BadgeSettings() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <BadgeCheck size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Badges
        </h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {badges.map(([name, threshold]) => (
          <div key={name} className="rounded border border-protect-sand p-3">
            <p className="font-semibold text-protect-teal">{name}</p>
            <p className="mt-1 text-sm text-protect-ink/70">{threshold}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
