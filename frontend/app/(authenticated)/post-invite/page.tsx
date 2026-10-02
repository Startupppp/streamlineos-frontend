import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession, AccessUnavailableError } from "@/lib/rbac/require-permission";
import { getServerAccessResult } from "@/lib/rbac/get-server-access";
import { resolveWizardGate } from "@/lib/wizard-gate";
import { resolveInvitationLanding } from "@/lib/invitation-landing";

export default async function PostInvitePage() {
  const session = await requireSession();
  const gate = resolveWizardGate(session, await cookies(), "/employee-onboarding");
  if (gate && gate !== "/employee-onboarding") redirect(gate);

  const result = await getServerAccessResult();
  if (!result.ok) throw new AccessUnavailableError(result.error);

  redirect(resolveInvitationLanding(result.access, gate));
}
