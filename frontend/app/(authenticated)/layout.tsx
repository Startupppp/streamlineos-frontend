import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

import { resolveWizardGate } from "../../lib/wizard-gate";
import { requireSession } from "../../lib/rbac/require-permission";
import { getServerAccess } from "../../lib/rbac/get-server-access";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { AppThemeScript } from "../../components/theme/app-theme-script";
import { AppThemeProvider } from "../../components/theme/app-theme-provider";
import { FeedbucketEmbed } from "../../components/feedbucket/feedbucket-embed";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  const gate = resolveWizardGate(session, cookieStore);

  if (gate) redirect(gate);

  const pathname = requestHeaders.get("x-pathname") ?? "";
  const isSettingsRoute =
    pathname === "/settings" || pathname.startsWith("/settings/");

  if (!isSettingsRoute) {
    const { mfa } = await getServerAccess();
    if (mfa?.enforced && !mfa.satisfied) redirect("/settings");
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
