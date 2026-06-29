import { LivePodcastPage } from "@/components/live/LivePodcastPage";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import {
  buildLiveMetricsFromComments,
  getActiveEvent,
  getDistricts,
  getVisibleComments
} from "@/lib/live/data";

export default async function LivePage() {
  const [event, districts, session] = await Promise.all([
    getActiveEvent(),
    getDistricts(),
    getCurrentUserAndProfile()
  ]);
  const comments = await getVisibleComments(event.id);
  const metrics = buildLiveMetricsFromComments(comments);

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
