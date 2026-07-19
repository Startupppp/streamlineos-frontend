import { getServerAuth } from "../../lib/get-server-auth";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isPlatformOwner, OWNER_HOME } from "../../lib/platform/role";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { FeedbucketEmbed } from "../../components/feedbucket/feedbucket-embed";
import { AppThemeProvider } from "../../components/theme/app-theme-provider";
import { AppThemeScript } from "../../components/theme/app-theme-script";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuth();

  if (!session?.user) {
    redirect("/signin");
  }

  const cookieStore = await cookies();
  const isPlatformAdminLike =
    session.user.isPlatformAdmin === true || isPlatformOwner(session.user.role);
  const orgSetupDone = cookieStore.get("org-setup-done")?.value === "1";
  if (session.orgId == null) {
    if (isPlatformAdminLike) redirect(OWNER_HOME);
    if (!orgSetupDone) redirect("/org-setup");
  } else if (
    !isPlatformAdminLike &&
    session.user.isOrgOwner === true &&
    !session.orgOnboardingCompletedAt &&
    !orgSetupDone
  ) {
    redirect("/org-setup");
  }

  const isAdminLike = session.user.isPlatformAdmin || session.user.isOrgOwner;
  const hasDashboardAccess = isAdminLike || session.user.hasDashboardAccess !== false;

  const defaultCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <AppThemeScript nonce={nonce} />
      <AppThemeProvider>
        <DashboardShell
          userId={session.user.id}
          hasDashboardAccess={hasDashboardAccess}
          defaultCollapsed={defaultCollapsed}
        >
          {children}
        </DashboardShell>
        <FeedbucketEmbed />
      </AppThemeProvider>
    </>
  );
}
