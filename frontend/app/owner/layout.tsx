import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { FocusedWizardFrame } from "@/components/wizard-shell";
import { requireSession } from "@/lib/rbac/require-permission";
import { resolveWizardGate } from "@/lib/wizard-gate";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OwnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();

  // Standing comes from the deployment allowlist the backend projects into the
  // session, never from a tenant role, so a customer administrator cannot reach
  // this route by holding any organization permission.
  if (session.isPlatformAdmin !== true) redirect("/dashboard");

  const gate = resolveWizardGate(session, await cookies());
  if (gate !== null && gate !== "/owner") redirect(gate);

  return (
    <FocusedWizardFrame mainLabel="Platform operations">
      {children}
    </FocusedWizardFrame>
  );
}
