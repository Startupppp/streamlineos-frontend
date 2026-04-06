"use client";

import Link from "next/link";
import { OnboardingWizard } from "@/components/hr/onboarding-wizard";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function OnboardingPage() {
  return (
    <PageWrapper
      title="Add Employee"
      subtitle="Complete the steps to onboard a new team member"
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Back to Employees</Link>
        </Button>
      }
    >
      <OnboardingWizard />
    </PageWrapper>
  );
}
