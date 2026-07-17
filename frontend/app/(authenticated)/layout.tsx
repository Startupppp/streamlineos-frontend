import { getServerAuth } from "../../lib/get-server-auth";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { FeedbucketEmbed } from "../../components/feedbucket/feedbucket-embed";
import { SessionProvider } from "../../components/providers/session-provider";
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

  const isAdminLike = session.user.isPlatformAdmin || session.user.isOrgOwner;
  const hasDashboardAccess = isAdminLike || session.user.hasDashboardAccess !== false;

  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <AppThemeScript nonce={nonce} />
      <AppThemeProvider>
        <SessionProvider session={session}>
          <DashboardShell
            userId={session.user.id}
            hasDashboardAccess={hasDashboardAccess}
            defaultCollapsed={defaultCollapsed}
          >
            {children}
          </DashboardShell>
        </SessionProvider>
        <FeedbucketEmbed />
      </AppThemeProvider>
    </>
  );
}
