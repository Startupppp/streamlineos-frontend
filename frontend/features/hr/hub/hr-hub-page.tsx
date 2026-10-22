"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HrPageContent } from "@/features/hr/shared/hr-ui";
import { StalledReadNotice } from "@/components/shared/stalled-read-notice";
import { PANEL_STALLED_AFTER_MS, useStalledAfter } from "@/hooks/common/use-stalled-after";
import { useHrHubSnapshot } from "@/hooks/api/hr/hub";
import { EMPTY_HR_HUB_ACCESS } from "@/hooks/api/hr/hub-types";
import { HrHubQueues } from "./hr-hub-queues";
import { HrHubMetrics } from "./hr-hub-metrics";
import { HrHubToday } from "./hr-hub-today";
import { HrHubActivity } from "./hr-hub-activity";

const RECRUITMENT_CAPABILITIES = new Set([
  "canInterviews",
  "canOffers",
  "canRequisitions",
  "canRequisitionsManage",
]);

export function HrHubPage() {
  const hub = useHrHubSnapshot();
  const access = hub.data?.capabilities ?? EMPTY_HR_HUB_ACCESS;
  const handleRetry = () => {
    void hub.refetch();
  };
  const hubLoading = hub.isPending;
  const hubStalled = useStalledAfter(hubLoading, PANEL_STALLED_AFTER_MS);

  const hasAnyPanel = Object.entries(access).some(
    ([capability, granted]) => granted && !RECRUITMENT_CAPABILITIES.has(capability),
  );

  return (
    <PageWrapper
      title="HR overview"
      subtitle="People operations hub — manage your team, track time, and run the full employee lifecycle"
      variant="display"
      actions={
        access.canOnboarding || access.canWorkflowsApprove || access.canAnnouncements ? (
          <div className="flex flex-wrap items-center gap-2">
            {access.canAnnouncements ? (
              <Button size="sm" variant="outline" asChild>
                <Link href="/hr/announcements">Create announcement</Link>
              </Button>
            ) : null}
            {access.canWorkflowsApprove ? (
              <Button size="sm" variant="outline" asChild>
                <Link href="/hr/approvals">Review approvals</Link>
              </Button>
            ) : null}
            {access.canOnboarding ? (
              <Button size="sm" asChild>
                <Link href="/hr/onboarding">Onboard employee</Link>
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <HrPageContent>
          {hub.isError ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-border/70 bg-card p-4 text-sm text-muted-foreground"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">The HR hub is temporarily unavailable.</span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleRetry}
                className="h-auto shrink-0 gap-1 p-0 text-sm text-status-info-ink"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : null}

          {hubStalled ? (
            <StalledReadNotice subject="the HR overview" onRetry={handleRetry} />
          ) : null}

          {!hubLoading && !hub.isError && !hasAnyPanel ? (
            <EmptyState
              className="flex-1"
              illustrationPreset="team"
              title="No HR panels available to you"
              description="Your access doesn't include any of this hub's sections yet. Ask an administrator to grant the HR permissions you need."
            />
          ) : null}

          <HrHubQueues
            access={access}
            snapshot={hub.data}
            isLoading={hubLoading}
            onRetry={handleRetry}
          />
          <HrHubToday
            access={access}
            snapshot={hub.data}
            isLoading={hubLoading}
            onRetry={handleRetry}
          />
          <HrHubActivity
            access={access}
            snapshot={hub.data}
            isLoading={hubLoading}
            onRetry={handleRetry}
          />
          <HrHubMetrics
            access={access}
            snapshot={hub.data}
            isLoading={hubLoading}
            onRetry={handleRetry}
          />
        </HrPageContent>
      </div>
    </PageWrapper>
  );
}
