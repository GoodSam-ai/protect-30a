import { LivePodcastPage } from "@/components/live/LivePodcastPage";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import {
  getDistricts,
  getEventBySlug,
  getLiveMetrics,
  getVisibleComments
} from "@/lib/live/data";
import { getCanonicalUrl } from "@/lib/site-config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    alternates: {
      canonical: getCanonicalUrl(`/live/${slug}`)
    }
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [districts, session] = await Promise.all([
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
