"use client";

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";
import { PageHeader } from "@/components/ui/page-header";

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Onboarding"
        description="Add a new team member to your organization."
      />
      <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-lg">
        <OnboardingWizard />
      </div>
    </div>
  );
}
