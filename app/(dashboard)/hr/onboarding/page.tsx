"use client";

import Link from "next/link";
import {
  Settings,
  ClipboardCheck,
  ArrowLeft,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";
import { OnboardingList } from "@/features/hr/onboarding/onboarding-list";
import { EmployeeDocumentsTab } from "@/features/hr/onboarding/onboarding-detail-sheet";
import { useAbility } from "@/lib/abilities-context";

function HrDocumentsTab() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Manage onboarding document configuration and review employee submissions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Configure Document Types</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Define which documents employees must submit during onboarding.
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                <Link href="/hr/document-types">Configure Document Types →</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Review Documents</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                View and approve documents submitted by employees during onboarding.
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                <Link href="/hr/document-review">Review Documents →</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const ability = useAbility();
  const isHROrCEO = ability.can("manage", "hr:employees");

  return (
    <PageWrapper
      title="Onboarding"
      subtitle={
        isHROrCEO
          ? "Onboard new team members and manage document requirements"
          : "Complete your onboarding steps"
      }
      noInternalScroll={!isHROrCEO}
      actions={
        isHROrCEO ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Employees
            </Link>
          </Button>
        ) : undefined
      }
    >
      {isHROrCEO ? (
        <Tabs defaultValue="wizard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workflow" className="text-xs h-7 px-3">
              Workflow
            </TabsTrigger>
            <TabsTrigger value="wizard" className="text-xs h-7 px-3">
              New Employee
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs h-7 px-3">
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="mt-0">
            <OnboardingList />
          </TabsContent>

          <TabsContent value="wizard" className="mt-0">
            <OnboardingWizard />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <HrDocumentsTab />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="checklist" className="flex flex-col flex-1 min-h-0">
          <TabsList className="h-8 shrink-0">
            <TabsTrigger value="checklist" className="text-xs h-7 px-3">
              My Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="flex-1 overflow-auto pb-6">
            <EmployeeDocumentsTab />
          </TabsContent>
        </Tabs>
      )}
    </PageWrapper>
  );
}
