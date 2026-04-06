"use client";

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function OnboardingPage() {
  return (
    <PageWrapper
      title="Add Employee"
      subtitle="Complete the steps to onboard a new team member"
    >
      <OnboardingWizard />
    </PageWrapper>
  );
}
