import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { canModerate, getCurrentUserAndProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { profile } = await getCurrentUserAndProfile();

  if (!profile || !canModerate(profile)) {
    redirect("/live");
  }

  return <AdminModerationPanel profile={profile} />;
}
