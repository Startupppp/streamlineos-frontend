import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { HydrationBoundary } from "@tanstack/react-query";

import { LayoutClient } from "../../components/layout/layout-client";
import { resolveWizardGate } from "../../lib/wizard-gate";
import { prefetchAccess } from "../../lib/prefetch/access";
import { resolveShellVariant } from "../../lib/shell-variant";
import { requireSession } from "../../lib/rbac/require-permission";
import { getServerAccess } from "../../lib/rbac/get-server-access";
import { AppThemeScript } from "../../components/theme/app-theme-script";
import { AppThemeProvider } from "../../components/theme/app-theme-provider";
import { FeedbucketEmbed } from "../../components/feedbucket/feedbucket-embed";
import { GlobalCreateTicketDialog } from "../../features/build/tickets/global-create-ticket-dialog";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

  const { mfa } = await getServerAccess();
  if (!isSettingsRoute && mfa?.enforced && !mfa.satisfied)
    redirect("/settings");

  const state = await prefetchAccess();

  const defaultCollapsed =
    cookieStore.get("sidebar-collapsed")?.value === "true";

  const shellVariant = resolveShellVariant(requestHeaders);

  return (
    <AppThemeProvider>
      <AppThemeScript nonce={nonce} />
      <HydrationBoundary state={state}>
        <LayoutClient
          userId={session.user.id}
          defaultCollapsed={defaultCollapsed}
          shellVariant={shellVariant}
          createTicketDialog={<GlobalCreateTicketDialog />}
        >
          {children}
        </LayoutClient>
      </HydrationBoundary>
      <FeedbucketEmbed />
    </AppThemeProvider>
  );
}
