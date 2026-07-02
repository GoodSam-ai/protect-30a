import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { getAdminDashboardData } from "@/lib/admin/data";
import { canModerate, getCurrentUserAndProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function isAdminConfigError(error: unknown) {
  return (
    error instanceof Error &&
    error.message === "Supabase admin environment variables are missing."
  );
}

function AdminSetupError() {
  return (
    <main className="min-h-screen bg-protect-cream px-4 py-10 text-protect-ink sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded border border-protect-sand bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-protect-ink/60">
          Admin configuration
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-protect-teal">
          Admin setup required
        </h1>
        <p className="mt-3 leading-7 text-protect-ink/75">
          Supabase admin credentials are not configured for this environment.
          Add the service-role key before using moderation, exports, imports, or
          event setup.
        </p>
      </section>
    </main>
  );
}

export default async function AdminPage() {
  const { profile } = await getCurrentUserAndProfile();

  if (!profile || !canModerate(profile)) {
    redirect("/live");
  }

  let dashboardData: Awaited<ReturnType<typeof getAdminDashboardData>>;

  try {
    dashboardData = await getAdminDashboardData();
  } catch (error) {
    if (isAdminConfigError(error)) return <AdminSetupError />;
    throw error;
  }

  return (
    <AdminModerationPanel
      profile={profile}
      dashboardData={dashboardData}
    />
  );
}
