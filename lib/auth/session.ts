import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileRole = "user" | "moderator" | "admin";

export type PublicProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  primary_district_id: string | null;
  is_restricted: boolean;
};

export async function getCurrentUserAndProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, primary_district_id, is_restricted")
    .eq("id", user.id)
    .single<PublicProfile>();

  if (error) {
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
