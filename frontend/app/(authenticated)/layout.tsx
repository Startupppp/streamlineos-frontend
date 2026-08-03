import { getServerAuth } from "../../lib/get-server-auth";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { signInPathForMissingSession } from "../../lib/auth-session-cookies";
import { getServerAccess } from "../../lib/rbac/get-server-access";
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

  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const cookieStore = await cookies();

  const isOrgOwner = session.user.isOrgOwner === true;
  const hasOrg = Boolean(session.orgId);
  const ownerSetupPending = isOrgOwner && !session.orgOnboardingCompletedAt;
  const orgSetupCookieName = session.orgId
    ? `org-setup-done--${session.orgId}`
    : null;
  const orgSetupDone = orgSetupCookieName
    ? Boolean(cookieStore.get(orgSetupCookieName)?.value)
    : false;
  const forceOrgSetup = !hasOrg || (ownerSetupPending && !orgSetupDone);

  if (forceOrgSetup) redirect("/org-setup");

  // Enforcement itself lives in the backend `MfaGuard`; this only spares the
  // user a shell full of 403s. `/settings` is exempt so the enrolment screen
  // stays reachable.
  const isSettingsRoute =
    pathname === "/settings" || pathname.startsWith("/settings/");
  if (!isSettingsRoute) {
    const { mfa } = await getServerAccess();
    if (mfa?.enforced && !mfa.satisfied) {
      redirect("/settings?tab=security&mfa=required");
    }
  }

  const defaultCollapsed =
    cookieStore.get("sidebar-collapsed")?.value === "true";

  return (
    <AppThemeProvider>
      <AppThemeScript nonce={nonce} />
      <DashboardShell
        userId={session.user.id}
        defaultCollapsed={defaultCollapsed}
      >
        {children}
      </DashboardShell>
      <FeedbucketEmbed />
    </AppThemeProvider>
  );
}
