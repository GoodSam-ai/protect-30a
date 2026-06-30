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
  const comments = await getVisibleComments(event.id);
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
