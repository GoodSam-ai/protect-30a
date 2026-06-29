import { LivePodcastPage } from "@/components/live/LivePodcastPage";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import {
  getActiveEvent,
  getDistricts,
  getLiveMetrics,
  getVisibleComments
} from "@/lib/live/data";

export default async function LivePage() {
  const [event, districts, session] = await Promise.all([
    getActiveEvent(),
    getDistricts(),
    getCurrentUserAndProfile()
  ]);
  const [comments, metrics] = await Promise.all([
    getVisibleComments(event.id),
    getLiveMetrics(event.id)
  ]);

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
