import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RemovedFromOrgCard } from "@/features/auth/removed-from-org-card";
import { requireSession } from "@/lib/rbac/require-permission";
import { resolveWizardGate } from "@/lib/wizard-gate";

export const metadata: Metadata = {
  title: "Removed from organisation",
  robots: { index: false, follow: false },
};

export default async function RemovedFromOrgPage() {
  const session = await requireSession();
  const gate = resolveWizardGate(session, await cookies(), "/removed-from-org");

  if (gate !== "/removed-from-org") redirect(gate ?? "/dashboard");

  return <RemovedFromOrgCard />;
}
