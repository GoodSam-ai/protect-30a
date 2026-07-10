import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ActionCenterFormType =
  | "pledge"
  | "rsvp"
  | "signup";

export type ActionCenterFields = Record<
  string,
  string | boolean | undefined
>;

type PublicPledgeRow = {
  fields: Record<string, unknown> | null;
};

export type PublicPledge = {
  first: string;
  neighborhood: string;
};

export async function saveActionCenterSubmission(
  formType: ActionCenterFormType,
  fields: ActionCenterFields
) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("action_center_submissions").insert({
    form_type: formType,
    fields
  });

  if (error) throw error;
}

export async function getPublicPledgeWall(): Promise<{
  count: number;
  recent: PublicPledge[];
}> {
  const admin = createSupabaseAdminClient();
  const [countResult, publicResult] = await Promise.all([
    admin
      .from("action_center_submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_type", "pledge"),
    admin
      .from("action_center_submissions")
      .select("fields")
      .eq("form_type", "pledge")
      .contains("fields", { consentPublic: true })
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  if (countResult.error) throw countResult.error;
  if (publicResult.error) throw publicResult.error;

  const recent = ((publicResult.data ?? []) as PublicPledgeRow[]).flatMap(
    (row) => {
      const first =
        typeof row.fields?.first === "string" ? row.fields.first.trim() : "";
      if (!first || row.fields?.consentPublic !== true) return [];

      const neighborhood =
        typeof row.fields.neighborhood === "string"
          ? row.fields.neighborhood.trim()
          : "";

      return [{ first, neighborhood }];
    }
  );

  return {
    count: countResult.count ?? 0,
    recent
  };
}
