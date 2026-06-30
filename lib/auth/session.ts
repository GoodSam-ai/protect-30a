import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type ProfileRole = "user" | "moderator" | "admin";

export type PublicProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  primary_district_id: string | null;
  is_restricted: boolean;
};

const PROFILE_COLUMNS =
  "id, display_name, avatar_url, role, primary_district_id, is_restricted";

function hasSupabaseEnv() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (hasUrl !== hasAnonKey) {
    throw new Error(
      "Supabase environment variables are partially configured."
    );
  }

  return hasUrl && hasAnonKey;
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function profileDisplayNameFromUser(user: User) {
  const metadata = user.user_metadata ?? {};
  const emailName =
    typeof user.email === "string" ? user.email.split("@")[0] : null;

  return (
    cleanString(metadata.full_name) ??
    cleanString(metadata.name) ??
    cleanString(metadata.user_name) ??
    cleanString(emailName) ??
    "Community member"
  );
}

function profileAvatarFromUser(user: User) {
  const metadata = user.user_metadata ?? {};

  return cleanString(metadata.avatar_url) ?? cleanString(metadata.picture);
}

function isMissingProfileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "PGRST116"
  );
}

async function createDefaultProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: User
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: profileDisplayNameFromUser(user),
        avatar_url: profileAvatarFromUser(user),
        role: "user",
        is_candidate: false,
        is_potential_guest: false,
        is_restricted: false
      },
      { onConflict: "id" }
    )
    .select(PROFILE_COLUMNS)
    .single<PublicProfile>();

  if (error) {
    return null;
  }

  return profile;
}

export async function getCurrentUserAndProfile() {
  if (!hasSupabaseEnv()) {
    return { user: null, profile: null };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single<PublicProfile>();

  if (error) {
    if (isMissingProfileError(error)) {
      return {
        user,
        profile: await createDefaultProfile(supabase, user)
      };
    }

    return { user, profile: null };
  }

  return { user, profile };
}

export function canModerate(profile: PublicProfile | null) {
  return (
    profile !== null &&
    !profile.is_restricted &&
    (profile.role === "admin" || profile.role === "moderator")
  );
}

export function canAdmin(profile: PublicProfile | null) {
  return profile !== null && !profile.is_restricted && profile.role === "admin";
}
