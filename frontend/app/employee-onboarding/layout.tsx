import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { FocusedWizardFrame } from "@/components/wizard-shell";
import { getServerAuth } from "@/lib/get-server-auth";
import { signInPathForMissingSession } from "@/lib/auth-session-cookies";

export default async function EmployeeOnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerAuth();

  if (!session?.user) redirect(signInPathForMissingSession());
  if (!session.orgId) redirect("/org-setup");
  if (session.user.isOrgOwner) redirect("/dashboard");
  if (session.userOnboardingCompletedAt) redirect("/dashboard");

  return (
    <FocusedWizardFrame
      mainLabel="Employee onboarding"
      mobileHeaderClassName="pt-3 pb-0"
    >
      {children}
    </FocusedWizardFrame>
  );
}
