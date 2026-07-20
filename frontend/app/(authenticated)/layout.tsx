import { getServerAuth } from "../../lib/get-server-auth";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { signInPathForMissingSession } from "../../lib/auth-session-cookies";
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

  if (!session?.user) redirect(signInPathForMissingSession());

  const cookieStore = await cookies();
  const isAdminLike = session.user.isPlatformAdmin || session.user.isOrgOwner;
  const hasDashboardAccess =
    isAdminLike || session.user.hasDashboardAccess !== false;

  const defaultCollapsed =
    cookieStore.get("sidebar-collapsed")?.value === "true";
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
