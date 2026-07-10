import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { FeedbucketEmbed } from "../../components/feedbucket/feedbucket-embed";
import { SessionProvider } from "../../components/providers/session-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const isAdminLike = session.user.isPlatformAdmin || session.user.isOrgOwner;
  const hasDashboardAccess = isAdminLike || session.user.hasDashboardAccess !== false;

  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar-collapsed")?.value === "true";

  return (
    <>
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
    </>
  );
}
