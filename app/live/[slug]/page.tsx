import { LivePodcastPage } from "@/components/live/LivePodcastPage";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import {
  getDistricts,
  getEventBySlug,
  getLiveMetrics,
  getVisibleComments
} from "@/lib/live/data";
import { notFound } from "next/navigation";

export default async function EventPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [districts, session, comments] = await Promise.all([
    getDistricts(),
    getCurrentUserAndProfile(),
    getVisibleComments(event.id)
  ]);
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
