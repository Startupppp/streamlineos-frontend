import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { FocusedWizardFrame } from "@/components/wizard-shell";
import { requireSession } from "@/lib/rbac/require-permission";
import { resolveWizardGate } from "@/lib/wizard-gate";

export default async function OrgSetupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();

  const gate = resolveWizardGate(session, await cookies());
  if (gate !== "/org-setup") redirect(gate ?? "/dashboard");

  return (
    <FocusedWizardFrame mainLabel="Organization setup">
      {children}
    </FocusedWizardFrame>
  );
}
