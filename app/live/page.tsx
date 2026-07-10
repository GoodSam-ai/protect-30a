import { LivePodcastPage } from "@/components/live/LivePodcastPage";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import {
  getActiveEvent,
  getDistricts,
  getLiveMetrics,
  getVisibleComments
} from "@/lib/live/data";
import { getCanonicalUrl } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: getCanonicalUrl("/live")
  }
};

export default async function LivePage() {
  const [event, districts, session] = await Promise.all([
    getActiveEvent(),
    getDistricts(),
    getCurrentUserAndProfile()
  ]);
  const comments = await getVisibleComments(event.id, session.user?.id ?? null);
  const metrics = await getLiveMetrics(event.id, comments);

  return (
    <LivePodcastPage
      event={event}
      districts={districts}
      comments={comments}
      metrics={metrics}
      profile={session.profile}
    />
  );
}
