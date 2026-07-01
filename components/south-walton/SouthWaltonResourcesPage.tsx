import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Landmark,
  Link2,
  MapPin,
  ShieldCheck,
  Waves
} from "lucide-react";

type OfficialResource = {
  title: string;
  description: string;
  href: string;
  icon: typeof ExternalLink;
};

type DistrictResource = {
  district: string;
  note: string;
  links: {
    label: string;
    href: string;
  }[];
};

const officialResources: OfficialResource[] = [
  {
    title: "Visit South Walton events",
    description:
      "Official tourism calendar for public events, neighborhood happenings, markets, and seasonal activities.",
    href: "https://www.visitsouthwalton.com/events/",
    icon: CalendarDays
  },
  {
    title: "Beach access info",
    description:
      "Official beach and bay access location resource for visitors and residents.",
    href: "https://www.visitsouthwalton.com/beach-bay-access-locations/",
    icon: MapPin
  },
  {
    title: "Beach safety",
    description:
      "Flag status, safety guidance, and visitor-facing beach information from the tourism site.",
    href: "https://www.visitsouthwalton.com/beach-safety/",
    icon: ShieldCheck
  },
  {
    title: "Travel guides",
    description:
      "Official guides that help residents, guests, and rental owners orient to South Walton.",
    href: "https://www.visitsouthwalton.com/vsw-resource-center/travel-guides/",
    icon: Link2
  }
];

const districtResources: DistrictResource[] = [
  {
    district: "Inlet Beach",
    note: "Eastern gateway district with direct overlap between Protect30A and tourism neighborhood context.",
    links: [
      {
        label: "Inlet Beach official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/inlet-beach/"
      }
    ]
  },
  {
    district: "Rosemary Beach",
    note: "Village-scale neighborhood context for eastern 30A conversations.",
    links: [
      {
        label: "Rosemary Beach official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/rosemary-beach/"
      }
    ]
  },
  {
    district: "Alys Beach",
    note: "Official visitor-facing neighborhood reference for Alys Beach.",
    links: [
      {
        label: "Alys Beach official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/alys-beach/"
      }
    ]
  },
  {
    district: "WaterSound, Seacrest, Prominence & Origins",
    note: "Grouped Protect30A district with multiple official neighborhood references.",
    links: [
      {
        label: "WaterSound official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/watersound/"
      },
      {
        label: "Seacrest official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/seacrest/"
      }
    ]
  },
  {
    district: "Seagrove, Seaside & WaterColor",
    note: "Central 30A district with three official neighborhood touchpoints.",
    links: [
      {
        label: "Seagrove official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/seagrove/"
      },
      {
        label: "Seaside official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/seaside/"
      },
      {
        label: "WaterColor official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/watercolor/"
      }
    ]
  },
  {
    district: "Grayton & Blue Mountain",
    note: "Western-central district tied to dune lake, trail, and beach access conversations.",
    links: [
      {
        label: "Grayton Beach official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/grayton-beach/"
      },
      {
        label: "Blue Mountain Beach official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/blue-mountain/"
      }
    ]
  },
  {
    district: "Santa Rosa Beach, Gulf Place & Dune Allen",
    note: "West 30A context spanning residential, commercial, and dune lake areas.",
    links: [
      {
        label: "Santa Rosa Beach official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/santa-rosa-beach/"
      },
      {
        label: "Gulf Place official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/gulf-place/"
      },
      {
        label: "Dune Allen official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/dune-allen/"
      }
    ]
  },
  {
    district: "Sandestin, Miramar Beach & Seascape",
    note: "Western gateway district with official destination and visitor-resource context.",
    links: [
      {
        label: "Sandestin official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/sandestin/"
      },
      {
        label: "Miramar Beach official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/miramar-beach/"
      },
      {
        label: "Seascape official guide",
        href: "https://www.visitsouthwalton.com/neighborhoods/seascape/"
      }
    ]
  }
];

const workflowSteps = [
  "Source label",
  "Official URL",
  "Neighborhood or district",
  "Last checked",
  "Moderator review"
];

const siteNavItems = [
  { label: "Home", href: "/" },
  { label: "The Show", href: "/show" },
  { label: "Districts", href: "/districts/" },
  { label: "Live Room", href: "/live" },
  { label: "Resources", href: "/south-walton-resources", current: true }
];

function ResourceLink({
  href,
  label
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#c9d8d2] bg-white px-3 py-2 text-sm font-semibold text-[#0e3b38] transition hover:border-[#0e3b38] hover:bg-[#f7fbfa]"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
      <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
    </a>
  );
}

export function SouthWaltonResourcesPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#22312f]">
      <nav
        aria-label="Protect30A site"
        className="sticky top-0 z-30 border-b border-[#d8d4c8] bg-[#fbf8f1]/95 text-[#22312f] shadow-sm backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between md:px-8">
          <a
            aria-label="Protect 30A home"
            className="inline-flex w-fit items-center gap-2 text-base font-bold text-[#0e3b38] transition hover:text-[#c56b4a]"
            href="/"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0e3b38] text-white">
              <Waves aria-hidden="true" className="h-5 w-5" />
            </span>
            Protect30A
          </a>
          <div className="flex flex-wrap gap-2">
            {siteNavItems.map((item) => (
              <a
                aria-current={item.current ? "page" : undefined}
                className={
                  item.current
                    ? "inline-flex min-h-10 items-center rounded-md bg-[#0e3b38] px-3 py-2 text-sm font-bold text-white"
                    : "inline-flex min-h-10 items-center rounded-md border border-[#d8d4c8] bg-white px-3 py-2 text-sm font-bold text-[#0e3b38] transition hover:border-[#0e3b38] hover:bg-[#f7fbfa]"
                }
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <section className="border-b border-[#d8d4c8] bg-[#0e3b38] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-14">
          <div className="flex flex-col justify-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#8fcdc4]">
              Protect30A resource layer
            </p>
            <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight md:text-6xl">
              Official South Walton Resources
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#dbe9e5]">
              Protect30A links to official tourism resources while keeping its
              own stormwater, civic engagement, and source-review content
              separate.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#c56b4a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#a95338]"
                href="#district-links"
              >
                District links
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/40 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                href="https://www.visitsouthwalton.com/"
                rel="noreferrer"
                target="_blank"
              >
                Visit South Walton
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div
            aria-label="Aerial-style Protect30A water and shoreline preview"
            className="min-h-[280px] overflow-hidden rounded-md border border-white/20 bg-[#0b302e] bg-[url('/og-image.jpg')] bg-contain bg-center bg-no-repeat shadow-2xl"
            role="img"
          >
            <div className="flex h-full min-h-[280px] items-end bg-[#0e3b38]/25 p-5">
              <div className="rounded-md bg-white/90 p-4 text-[#22312f] shadow-lg backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0e3b38]">
                  <Waves aria-hidden="true" className="h-4 w-4" />
                  Stormwater context stays on Protect30A
                </div>
                <p className="mt-2 max-w-sm text-sm leading-6">
                  Tourism resources are linked as official references, with
                  attribution and review notes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {officialResources.map((resource) => {
            const Icon = resource.icon;
            return (
              <article
                className="rounded-md border border-[#d8d4c8] bg-white p-5 shadow-sm"
                key={resource.href}
              >
                <Icon aria-hidden="true" className="h-6 w-6 text-[#c56b4a]" />
                <h2 className="mt-4 text-xl font-bold text-[#0e3b38]">
                  {resource.title}
                </h2>
                <p className="mt-2 min-h-20 text-sm leading-6 text-[#50605d]">
                  {resource.description}
                </p>
                <div className="mt-4">
                  <ResourceLink href={resource.href} label={resource.title} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[#d8d4c8] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[0.8fr_1.2fr] md:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#c56b4a]">
              Permission-aware integration
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-[#0e3b38]">
              Curated links, not copied content
            </h2>
            <p className="mt-4 text-base leading-7 text-[#50605d]">
              No Visit South Walton photos, maps, or descriptions are
              republished here. Protect30A can point residents and guests to
              official resources while preserving attribution and review status.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {workflowSteps.map((step, index) => (
              <div
                className="rounded-md border border-[#c9d8d2] bg-[#f7fbfa] p-4"
                key={step}
              >
                <div className="font-mono text-xs font-bold text-[#c56b4a]">
                  0{index + 1}
                </div>
                <div className="mt-3 text-sm font-bold text-[#0e3b38]">
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-10 md:px-8"
        id="district-links"
      >
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#c56b4a]">
              Neighborhood crosswalk
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-[#0e3b38]">
              District Resource Links
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#50605d]">
            Each Protect30A district can link to official Visit South Walton
            neighborhood pages without blending tourism copy into civic issue
            pages.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {districtResources.map((district) => (
            <article
              className="rounded-md border border-[#d8d4c8] bg-white p-5 shadow-sm"
              key={district.district}
            >
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e7f3f1] text-[#0e3b38]">
                  <Landmark aria-hidden="true" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0e3b38]">
                    {district.district}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#50605d]">
                    {district.note}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {district.links.map((link) => (
                  <ResourceLink
                    href={link.href}
                    key={link.href}
                    label={link.label}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
