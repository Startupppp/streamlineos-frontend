"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCanState } from "@/hooks/api/access";
import { useCoachingDigest } from "@/hooks/api/crm/call-intelligence";
import { getErrorMessage } from "@/lib/get-error-message";
import { CoachingDigestView } from "@/features/crm/intelligence/coaching-digest";

const WINDOWS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

/**
 * Call intelligence for a manager: the team digest over a trailing window.
 *
 * A single call's analysis is not here — it belongs on the call, where the rep
 * who made it reads it first. `CallAnalysisPanel` renders that wherever an
 * activity is shown. This page is the aggregate, and it is gated on the team key
 * for the same reason: reading your own call is a rep's business, and reading
 * everybody's is a manager's.
 */
export default function CallIntelligencePage() {
  const [sinceDays, setSinceDays] = useState(30);
  const digest = useCoachingDigest(sinceDays);

  const handleWindowChange = useCallback((value: string) => setSinceDays(Number(value)), []);

  /**
   * Ticket 26. Without this the read below is disabled by the gate and reports
   * no rows with `isLoading: false` — indistinguishable from a team that has
   * made no calls. A rep landing here should be told they need the team key, not
   * that their colleagues have never spoken to anybody.
   */
  if (useCanState("crm:call-analysis:view-team") === "denied")
    return (
      <NoPermissionState
        permission="crm:call-analysis:view-team"
        description="The team coaching digest is for managers. Your own calls' analyses appear on the calls themselves."
      />
    );

  return (
    <PageWrapper
      title="Call intelligence"
      subtitle="How the team's calls are going"
      actions={
        /**
         * The per-rep view (CRM-P2-05) and the best-call search (CRM-P2-06) live
         * one level down. They are not on this page because they answer a
         * different question and carry a different gate: this digest is
         * deliberately un-attributed and manager-only, while `/reps` is gated on
         * `crm:call-analysis:view` so a rep can read their own numbers.
         */
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
        ) : digest.error ? (
          <ErrorState
            title="Couldn't load the coaching digest"
            description={getErrorMessage(digest.error)}
            onRetry={() => void digest.refetch()}
          />
        ) : digest.data ? (
          <CoachingDigestView response={digest.data} />
        ) : null}
      </div>
    </PageWrapper>
  );
}
