import { BarChart3 } from "lucide-react";

const weights = [
  ["Comment", "1 point"],
  ["Like received", "3 points"],
  ["Share", "2 points"],
  ["Featured comment", "10 points"]
];

export function ScoringSettings() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <BarChart3 size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Scoring
        </h2>
      </div>

      <div className="mt-4 overflow-hidden rounded border border-protect-sand">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-protect-cream text-protect-teal">
            <tr>
              <th className="border-b border-protect-sand px-3 py-2 font-semibold">
                Signal
              </th>
              <th className="border-b border-protect-sand px-3 py-2 font-semibold">
                Weight
              </th>
            </tr>
          </thead>
          <tbody>
            {weights.map(([signal, weight]) => (
              <tr key={signal}>
                <td className="border-b border-protect-sand px-3 py-2">
                  {signal}
                </td>
                <td className="border-b border-protect-sand px-3 py-2 font-semibold text-protect-teal">
                  {weight}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
