"use client";

import { BadgeSettings } from "@/components/admin/BadgeSettings";
import { EngagementExport } from "@/components/admin/EngagementExport";
import { EventEditor } from "@/components/admin/EventEditor";
import { FeaturedCommentsPanel } from "@/components/admin/FeaturedCommentsPanel";
import { ManualFacebookImport } from "@/components/admin/ManualFacebookImport";
import { ReportedCommentsQueue } from "@/components/admin/ReportedCommentsQueue";
import { ScoringSettings } from "@/components/admin/ScoringSettings";
import type { ReportedCommentQueueItem } from "@/lib/admin/types";
import type { PublicProfile } from "@/lib/auth/session";
import {
  BadgeCheck,
  CalendarDays,
  Download,
  Flag,
  MessageSquarePlus,
  Settings2,
  Star
} from "lucide-react";
import { useState } from "react";

const tabs = [
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "reported", label: "Reported comments", icon: Flag },
  { id: "featured", label: "Featured comments", icon: Star },
  { id: "facebook", label: "Manual Facebook import", icon: MessageSquarePlus },
  { id: "exports", label: "Exports", icon: Download },
  { id: "scoring", label: "Scoring", icon: Settings2 },
  { id: "badges", label: "Badges", icon: BadgeCheck }
] as const;

type TabId = (typeof tabs)[number]["id"];

export function AdminModerationPanel({
  profile,
  reportedComments
}: {
  profile: PublicProfile;
  reportedComments: ReportedCommentQueueItem[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("events");
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <main className="min-h-screen bg-protect-cream text-protect-ink">
      <section className="border-b border-protect-sand bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-protect-terra">
                Protect30A Live
              </p>
              <h1 className="mt-1 font-serif text-3xl font-bold text-protect-teal">
                Live engagement admin
              </h1>
            </div>
            <p className="w-fit rounded border border-protect-sand bg-protect-cream px-3 py-1.5 text-sm font-semibold text-protect-teal">
              {profile.display_name ?? "Moderator"} · {profile.role}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-8">
        <nav
          aria-label="Admin sections"
          className="rounded border border-protect-sand bg-white p-2 shadow-sm"
        >
          <div className="grid gap-1" role="tablist" aria-orientation="vertical">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`admin-panel-${tab.id}`}
                  id={`admin-tab-${tab.id}`}
                  className={
                    isActive
                      ? "flex min-h-11 items-center gap-2 rounded bg-protect-teal px-3 text-left text-sm font-semibold text-white"
                      : "flex min-h-11 items-center gap-2 rounded px-3 text-left text-sm font-semibold text-protect-teal hover:bg-protect-cream"
                  }
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={18} aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <section
          id={`admin-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`admin-tab-${active.id}`}
          className="rounded border border-protect-sand bg-white p-4 shadow-sm sm:p-5"
        >
          {activeTab === "events" ? <EventEditor /> : null}
          {activeTab === "reported" ? (
            <ReportedCommentsQueue reportedComments={reportedComments} />
          ) : null}
          {activeTab === "featured" ? <FeaturedCommentsPanel /> : null}
          {activeTab === "facebook" ? <ManualFacebookImport /> : null}
          {activeTab === "exports" ? <EngagementExport /> : null}
          {activeTab === "scoring" ? <ScoringSettings /> : null}
          {activeTab === "badges" ? <BadgeSettings /> : null}
        </section>
      </div>
    </main>
  );
}
