import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { requireSession } from "../../lib/rbac/require-permission";
import { resolveWizardGate } from "../../lib/wizard-gate";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { FeedbucketEmbed } from "../../components/feedbucket/feedbucket-embed";
import { AppThemeProvider } from "../../components/theme/app-theme-provider";
import { AppThemeScript } from "../../components/theme/app-theme-script";

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
