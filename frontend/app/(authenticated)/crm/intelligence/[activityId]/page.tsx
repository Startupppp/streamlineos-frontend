"use client";

import { use } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { NoPermissionState } from "@/components/shared";
import { CallAnalysisPanel } from "@/features/crm/intelligence/call-analysis-panel";
import { CallParticipantsCard } from "@/features/crm/intelligence/call-participants-card";
import { useCanState } from "@/hooks/api/access";
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
  const state = useCanState("crm:call-analysis:view");
  /**
   * Read here as well as inside the panel so the subtitle can say when the call
   * was analysed. Same query key, so TanStack serves both from one request.
   */
  const { data } = useCallAnalysis(activityId);

  if (state === "denied")
    return (
      <NoPermissionState
        permission="crm:call-analysis:view"
        description="Reading a call's analysis needs the call-analysis key. Your own calls' analyses appear on the calls themselves."
      />
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
      backHref="/crm/intelligence"
      backLabel="Back to call intelligence"
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
