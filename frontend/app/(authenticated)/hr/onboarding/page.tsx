"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Settings,
  ClipboardCheck,
  ArrowLeft,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";
import { OnboardingList } from "@/features/hr/onboarding/onboarding-list";
import { EmployeeDocumentsTab } from "@/features/hr/onboarding/onboarding-detail-sheet";
import { OnboardingTemplatesTab } from "@/features/hr/onboarding/onboarding-templates-tab";
import { BulkOnboardPanel } from "@/features/hr/onboarding/bulk-onboard-panel";
import { useCan } from "@/hooks/api/access";

type NewEmployeeMode = "single" | "bulk";

function NewEmployeeSection() {
  const [mode, setMode] = useState<NewEmployeeMode>("single");

  return (
    <div className="space-y-4">
      <div
        className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-muted/30 p-1 backdrop-blur-sm"
        role="tablist"
        aria-label="Onboard mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "single"}
          onClick={() => setMode("single")}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all duration-200",
            mode === "single"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/70",
          )}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Single employee
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "bulk"}
          onClick={() => setMode("bulk")}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all duration-200",
            mode === "bulk"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/70",
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Bulk upload
        </button>
      </div>

      {mode === "single" ? <OnboardingWizard /> : <BulkOnboardPanel />}
    </div>
  );
}

function ProbationEntryCard() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review and manage employee probation confirmations and extensions.
      </p>
      <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-7 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Probation Reviews</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              View employees due for probation confirmation or extension.
            </p>
            <Button size="sm" variant="outline" className="text-xs gap-1.5 duration-200" asChild>
              <Link href="/hr/onboarding/probation">View Reviews</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HrDocumentsTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage onboarding document configuration and review employee submissions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-7 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <Settings className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Configure Document Types</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Define which documents employees must submit during onboarding.
              </p>
              <Button size="sm" variant="outline" className="text-xs gap-1.5 duration-200" asChild>
                <Link href="/hr/document-types">Configure Types</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-7 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Review Documents</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                View and approve documents submitted by employees during onboarding.
              </p>
              <Button size="sm" variant="outline" className="text-xs gap-1.5 duration-200" asChild>
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
          ? "Hire one person or a whole cohort — then track documents and probation"
          : "Complete your onboarding steps"
      }
 variant="display"
      noInternalScroll={!isHROrCEO}
      actions={
        isHROrCEO ? (
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
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
          <TabsList className="rounded-xl border border-border/70 p-1 h-auto bg-muted/30 backdrop-blur-sm">
            <TabsTrigger
              value="workflow"
              className="text-xs h-8 px-3 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Workflow
            </TabsTrigger>
            <TabsTrigger
              value="plans"
              className="text-xs h-8 px-3 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Plans
            </TabsTrigger>
            <TabsTrigger
              value="wizard"
              className="text-xs h-8 px-3 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              New Employee
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="text-xs h-8 px-3 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Documents
            </TabsTrigger>
            <TabsTrigger
              value="probation"
              className="text-xs h-8 px-3 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Probation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="mt-0">
            <OnboardingList />
          </TabsContent>

          <TabsContent value="plans" className="mt-0">
            <OnboardingTemplatesTab />
          </TabsContent>

          <TabsContent value="wizard" className="mt-0">
            <NewEmployeeSection />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <HrDocumentsTab />
          </TabsContent>

          <TabsContent value="probation" className="mt-0">
            <ProbationEntryCard />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="checklist" className="flex flex-col flex-1 min-h-0">
          <TabsList className="shrink-0 rounded-lg border p-1 bg-muted/40">
            <TabsTrigger
              value="checklist"
              className="text-xs h-8 px-3 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
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
