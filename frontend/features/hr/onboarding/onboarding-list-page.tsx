"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  ClipboardCheck,
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
          <div className="w-7 rounded-lg bg-status-info-surface flex items-center justify-center shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-status-info-ink" />
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

function HrDocumentsTab({
  canConfigure,
  canReview,
}: {
  canConfigure: boolean;
  canReview: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage onboarding document configuration and review employee submissions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {canConfigure && (
          <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-7 rounded-lg bg-status-info-surface flex items-center justify-center shrink-0">
                <Settings className="h-3.5 w-3.5 text-status-info-ink" />
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
        )}

        {canReview && (
          <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-7 rounded-lg bg-status-info-surface flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-3.5 w-3.5 text-status-info-ink" />
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
        )}
      </div>
    </div>
  );
}

const VALID_TABS = ["workflow", "plans", "wizard", "documents", "probation"] as const;

export function OnboardingListPage() {
  const canManageOnboarding = useCan("hr:onboarding:manage");
  const canManageDocumentTypes = useCan("hr:documents:manage");
  const canReviewDocuments = useCan("hr:documents:view");
  const canViewProbation = useCan("hr:probation:view");
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const visibleTabs = VALID_TABS.filter((tab) => {
    if (tab === "documents") {
      return canManageDocumentTypes || canReviewDocuments;
    }
    if (tab === "probation") return canViewProbation;
    return true;
  });
  const initialTab = visibleTabs.includes(
    requestedTab as (typeof VALID_TABS)[number],
  )
    ? (requestedTab as (typeof VALID_TABS)[number])
    : "wizard";

  return (
    <PageWrapper
      title="Onboarding"
      subtitle={
        canManageOnboarding
          ? "Hire one person or a whole cohort — then track their onboarding"
          : "Complete your onboarding steps"
      }
      noInternalScroll={!canManageOnboarding}
      backHref={canManageOnboarding ? "/hr" : undefined}
      backLabel="Back to Employees"
    >
      {canManageOnboarding ? (
        <Tabs defaultValue={initialTab} className="space-y-4">
          <TabsList className="rounded-xl border-border/70 bg-muted/30 backdrop-blur-sm">
            <TabsTrigger
              value="workflow"
              className="text-xs"
            >
              Workflow
            </TabsTrigger>
            <TabsTrigger
              value="plans"
              className="text-xs"
            >
              Plans
            </TabsTrigger>
            <TabsTrigger
              value="wizard"
              className="text-xs"
            >
              New Employee
            </TabsTrigger>
            {(canManageDocumentTypes || canReviewDocuments) && (
              <TabsTrigger value="documents" className="text-xs">
                Documents
              </TabsTrigger>
            )}
            {canViewProbation && (
              <TabsTrigger value="probation" className="text-xs">
                Probation
              </TabsTrigger>
            )}
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

          {(canManageDocumentTypes || canReviewDocuments) && (
            <TabsContent value="documents" className="mt-0">
              <HrDocumentsTab
                canConfigure={canManageDocumentTypes}
                canReview={canManageDocumentTypes || canReviewDocuments}
              />
            </TabsContent>
          )}

          {canViewProbation && (
            <TabsContent value="probation" className="mt-0">
              <ProbationEntryCard />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <Tabs defaultValue="checklist" className="flex flex-col flex-1 min-h-0">
          <TabsList className="bg-muted/40">
            <TabsTrigger
              value="checklist"
              className="text-xs"
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
