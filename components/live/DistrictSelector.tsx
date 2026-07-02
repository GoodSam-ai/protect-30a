import type { District } from "@/lib/live/types";
import { MapPinned } from "lucide-react";

const districtPageSlugByLiveSlug: Record<string, string> = {
  watersound: "watersound-seacrest-prominence-origins",
  seagrove: "seagrove-seaside-watercolor",
  "grayton-beach": "grayton-blue-mountain",
  "santa-rosa-beach": "santa-rosa-beach-gulf-place-dune-allen",
  sandestin: "sandestin-miramar-beach-seascape"
};

function getDistrictPageHref(district: District) {
  const slug = districtPageSlugByLiveSlug[district.slug] ?? district.slug;
  return `/districts/${slug}/`;
}

export function DistrictSelector({
  districts,
  selectedDistrictId
}: {
  districts: District[];
  selectedDistrictId: string | null;
}) {
  return (
    <section
      className="rounded border border-protect-sand bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="district-selector-heading"
    >
      <div className="flex items-center gap-2">
        <MapPinned
          size={19}
          className="text-protect-terra"
          aria-hidden="true"
        />
        <h2
          id="district-selector-heading"
          className="font-serif text-xl font-semibold text-protect-teal"
        >
          District focus
        </h2>
      </div>
      <div
        className="mt-4 flex flex-wrap gap-2"
        role="list"
        aria-label="30A districts"
      >
        {districts.map((district) => {
          const selected = district.id === selectedDistrictId;

          return (
            <span
              key={district.id}
              role="listitem"
            >
              <a
                href={getDistrictPageHref(district)}
                aria-current={selected ? "true" : undefined}
                className={
                  selected
                    ? "inline-flex min-h-10 items-center rounded border border-protect-teal bg-protect-teal px-3 py-2 text-sm font-semibold text-white"
                    : "inline-flex min-h-10 items-center rounded border border-protect-sand bg-protect-cream px-3 py-2 text-sm font-semibold text-protect-teal hover:bg-white"
                }
              >
                {district.name}
              </a>
            </span>
          );
        })}
      </div>
    </section>
  );
}
