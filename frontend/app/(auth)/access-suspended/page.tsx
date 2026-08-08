import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SuspendedAccessCard } from "@/features/auth/suspended-access-card";
import { requireSession } from "@/lib/rbac/require-permission";
import { resolveWizardGate } from "@/lib/wizard-gate";

export const metadata: Metadata = {
  title: "Organization access paused",
  robots: { index: false, follow: false },
};

export default async function AccessSuspendedPage() {
  const session = await requireSession();
  const gate = resolveWizardGate(session, await cookies());

  if (gate !== "/access-suspended") redirect(gate ?? "/dashboard");

  return (
    <SuspendedAccessCard
      organizationName={session.suspendedOrganizationName ?? null}
    />
  );
}
