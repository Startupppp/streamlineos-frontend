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
import { useCan } from "@/hooks/api/access";

function HrDocumentsTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage onboarding document configuration and review employee submissions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <Settings className="h-3.5 w-3.5 text-violet-700 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Configure Document Types</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Define which documents employees must submit during onboarding.
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 duration-200" asChild>
                <Link href="/hr/document-types">Configure Types</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Review Documents</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                View and approve documents submitted by employees during onboarding.
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 duration-200" asChild>
                <Link href="/hr/document-review">Review Submissions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const isHROrCEO = useCan("hr:employees:manage");

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
          <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5">
            <Link href="/hr">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Employees
            </Link>
          </Button>
        ) : undefined
      }
    >
      {isHROrCEO ? (
        <Tabs defaultValue="wizard" className="space-y-4">
          <TabsList className="rounded-lg border p-1 h-auto bg-muted/40">
            <TabsTrigger
              value="workflow"
              className="text-xs h-7 px-3 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Workflow
            </TabsTrigger>
            <TabsTrigger
              value="wizard"
              className="text-xs h-7 px-3 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              New Employee
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="text-xs h-7 px-3 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
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
          <TabsList className="h-8 shrink-0 rounded-lg border p-1 bg-muted/40">
            <TabsTrigger
              value="checklist"
              className="text-xs h-7 px-3 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              My Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="flex-1 overflow-auto pb-6 mt-4">
            <EmployeeDocumentsTab />
          </TabsContent>
        </Tabs>
      )}
    </PageWrapper>
  );
}
