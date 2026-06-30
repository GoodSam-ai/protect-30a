import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { getReportedCommentsQueue } from "@/lib/admin/data";
import { canModerate, getCurrentUserAndProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { profile } = await getCurrentUserAndProfile();

  if (!profile || !canModerate(profile)) {
    redirect("/live");
  }

  const reportedComments = await getReportedCommentsQueue();

  return (
    <AdminModerationPanel
      profile={profile}
      reportedComments={reportedComments}
    />
  );
}
