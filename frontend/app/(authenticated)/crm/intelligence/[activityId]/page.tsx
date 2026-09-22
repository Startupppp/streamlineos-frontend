"use client";

import Link from "next/link";
import { use } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { CallAnalysisPanel } from "@/components/call-intelligence/call-analysis-panel";
import { CallParticipantsCard } from "@/features/crm/intelligence/call-participants-card";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useCallAnalysis } from "@/hooks/api/crm/call-intelligence";
import { formatShortDate } from "@/lib/date-utils";

/**
 * One call's analysis, as a page of its own.
 *
 * Not a row of the list at `/crm/intelligence` opened up — that page is the
 * coaching digest, which reports bands over a cohort and names nobody, because
 * a per-rep read is the leaderboard `call-coaching.controller` refuses to build.
 * This is the permalink for the panel the timeline already renders inline: the
 * address a manager can be sent, and the page a rep opens to read their own
 * call. It binds to `GET /crm/calls/:activityId/analysis`, the only per-call
 * read the backend has; participants are the one other fact keyed by this id,
 * and they come from the activities surface under their own key.
 */
export default function CallIntelligenceDetailPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = use(params);

  return (
    <RequireModule module="crm">
      <CallIntelligenceDetail activityId={activityId} />
    </RequireModule>
  );
}

function CallIntelligenceDetail({ activityId }: { activityId: string }) {
  /**
   * Ticket 26. The reads below disable themselves without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the page tells
   * somebody this call has never been analysed, when the truth is that they are
   * not allowed to read it.
   */
  const canReadTeam = useCan("crm:call-analysis:view-team");
  const { data } = useCallAnalysis(activityId);

  const pageState = usePageState({ permission: "crm:call-analysis:view", isLoading: false, isError: false });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title="Call analysis" backHref={canReadTeam ? "/crm/intelligence/reps" : undefined}>
        <PageState resolution={pageState} loading={null} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  /**
   * The id identifies the call to the router; it says nothing to a reader, and
   * §5 counts a visible UUID as a bug. The analysis date is the one fact about
   * this call available before the panel resolves — and it is absent exactly
   * when the analysis is embargoed or has never run, where a subtitle claiming
   * anything would be worse than none.
   */
  const analysedOn = data?.data ? formatShortDate(data.data.analysedAt) : "";

  return (
    <PageWrapper
      title="Call analysis"
      subtitle={analysedOn ? `Analysed ${analysedOn}` : undefined}
      backHref={canReadTeam ? "/crm/intelligence" : "/crm/intelligence/reps"}
      backLabel={canReadTeam ? "Back to call intelligence" : "Back to call metrics"}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/crm/intelligence/reps">Call metrics</Link>
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <CallAnalysisPanel activityId={activityId} />
          </CardContent>
        </Card>

        <CallParticipantsCard activityId={activityId} />
      </div>
    </PageWrapper>
  );
}
