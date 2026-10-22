"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useCoachingDigest } from "@/hooks/api/crm/call-intelligence";
import { CoachingDigestView } from "@/features/crm/intelligence/coaching-digest";

const WINDOWS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export default function CallIntelligencePage() {
  const [sinceDays, setSinceDays] = useState(30);
  const digest = useCoachingDigest(sinceDays);

  const handleWindowChange = useCallback((value: string) => setSinceDays(Number(value)), []);

  const pageState = usePageState({
    permission: "crm:call-analysis:view-team",
    isLoading: digest.isLoading,
    isError: !!digest.error,
    error: digest.error,
  });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Call intelligence" subtitle="How the team's calls are going">
        <PageState resolution={pageState} loading={null} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Call intelligence"
      subtitle="How the team's calls are going"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/crm/intelligence/reps">Per-rep metrics</Link>
        </Button>
      }
      filters={
        <Tabs value={String(sinceDays)} onValueChange={handleWindowChange}>
          <TabsList>
            {WINDOWS.map((window) => (
              <TabsTrigger key={window.value} value={window.value}>
                {window.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
        {digest.isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : digest.data && digest.data.data.cohort === 0 ? (
          <EmptyState
            illustrationPreset="report"
            title="No calls analysed in this window"
            description="A call joins the digest once somebody runs its analysis. Widen the window, or open a call and analyse it."
            className="flex-1 min-h-0"
          />
        ) : digest.data ? (
          <CoachingDigestView response={digest.data} />
        ) : null}
      </div>
    </PageWrapper>
  );
}
