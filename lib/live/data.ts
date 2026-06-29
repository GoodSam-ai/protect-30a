import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fixtureComments,
  fixtureDistricts,
  fixtureEvent,
  fixtureMetrics
} from "./fixtures";
import type { LiveComment } from "./types";

type VisibleCommentRow = {
  id: string;
  event_id: string;
  district_id: string | null;
  parent_comment_id: string | null;
  body: string;
  topic: string | null;
  is_featured: boolean;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  like_count: number | null;
};

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function getDistricts() {
  if (!hasSupabaseEnv()) return fixtureDistricts;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("districts")
    .select("id, name, slug, description, sort_order")
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getActiveEvent() {
  if (!hasSupabaseEnv()) return fixtureEvent;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("podcast_events")
    .select("*")
    .eq("is_active", true)
    .order("starts_at", { ascending: true })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function getEventBySlug(slug: string) {
  if (!hasSupabaseEnv()) {
    return slug === fixtureEvent.slug ? fixtureEvent : null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("podcast_events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getVisibleComments(
  eventId: string
): Promise<LiveComment[]> {
  if (!hasSupabaseEnv()) {
    return fixtureComments.filter((comment) => comment.event_id === eventId);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("visible_comments")
    .select(
      "id, event_id, district_id, parent_comment_id, body, topic, is_featured, created_at, display_name, avatar_url, like_count"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as VisibleCommentRow[]).map((comment) => ({
    id: comment.id,
    event_id: comment.event_id,
    district_id: comment.district_id,
    user_id: null,
    parent_comment_id: comment.parent_comment_id,
    body: comment.body,
    topic: comment.topic,
    is_featured: comment.is_featured,
    created_at: comment.created_at,
    like_count: comment.like_count ?? 0,
    liked_by_me: false,
    author_display_name: comment.display_name || "Community member",
    author_avatar_url: comment.avatar_url
  }));
}

export async function getLiveMetrics(_eventId: string) {
  if (!hasSupabaseEnv()) return fixtureMetrics;
  const comments = await getVisibleComments(_eventId);
  return {
    totalComments: comments.length,
    totalLikes: comments.reduce((sum, comment) => sum + comment.like_count, 0),
    totalShares: 0,
    commentsPerMinute: 0,
    topTopics: Object.entries(
      comments.reduce<Record<string, number>>((acc, comment) => {
        if (comment.topic) acc[comment.topic] = (acc[comment.topic] || 0) + 1;
        return acc;
      }, {})
    ).map(([topic, count]) => ({ topic, count }))
  };
}
