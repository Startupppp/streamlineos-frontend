"use client";

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function OnboardingPage() {
  return (
    <PageWrapper
      title="Employee Onboarding"
      subtitle="Add a new team member to your organization."
    >
      <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-lg">
        <OnboardingWizard />
      </div>
    </PageWrapper>
  );
}
