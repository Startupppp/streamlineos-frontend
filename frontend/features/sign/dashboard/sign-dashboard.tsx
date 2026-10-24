"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Inbox, Send, CheckCircle2, Clock, AlertTriangle, FileStack, UploadCloud } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useMotionVariants } from "@/lib/motion-variants";
import { useSignDashboard, useSignSummary } from "@/hooks/api/sign/reports";
import { useOrgTimeZone } from "@/hooks/api/org-display";
import { formatDateTimeInOrgTz } from "@/lib/date-utils";
import { CreateEnvelopeDialog } from "@/components/sign/create-envelope-dialog";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { SignReportsPanels, SignReportsSkeleton } from "../reports/reports-page";
import { SignDashboardSkeleton } from "./sign-dashboard-skeleton";

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function queryIsPending(isLoading: boolean, hasData: boolean, isError: boolean): boolean {
  return (isLoading || !hasData) && !isError;
}

function SectionFallback({
  resolution,
  onRetry,
}: {
  resolution: PageStateResolution;
  onRetry: () => void;
}) {
  if (resolution.kind === "ready" || resolution.kind === "denied" || resolution.kind === "loading") {
    return null;
  }
  return (
    <PageState resolution={resolution} loading={null} onRetry={onRetry} compact>
      {null}
    </PageState>
  );
}

function pageResolution(
  dashboard: PageStateResolution,
  reports: PageStateResolution,
): PageStateResolution {
  if (dashboard.kind === "session-expired" || reports.kind === "session-expired") {
    return { kind: "session-expired" };
  }
  if (dashboard.kind === "ready" || reports.kind === "ready") return { kind: "ready" };
  if (dashboard.kind === "loading" || reports.kind === "loading") return { kind: "loading" };
  if (dashboard.kind !== "denied") return dashboard;
  return reports;
}

export function SignDashboard() {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const canCreateEnvelope = useCan("sign:envelope:create");
  const [createOpen, setCreateOpen] = useState(false);
  const dashboardQuery = useSignDashboard();
  const summaryQuery = useSignSummary();
  const orgTimeZone = useOrgTimeZone();
  const data = dashboardQuery.data;
  const summary = summaryQuery.data;
  const dashboardState = usePageState({
    permission: "sign:envelope:view",
    isLoading: queryIsPending(dashboardQuery.isLoading, data !== undefined, dashboardQuery.isError),
    isError: dashboardQuery.isError,
    error: dashboardQuery.error,
  });
  const reportsState = usePageState({
    permission: "sign:audit:view",
    isLoading: queryIsPending(summaryQuery.isLoading, summary !== undefined, summaryQuery.isError),
    isError: summaryQuery.isError,
    error: summaryQuery.error,
  });

  function handleRetry() {
    void dashboardQuery.refetch();
    void summaryQuery.refetch();
  }

  function handleDashboardRetry() {
    void dashboardQuery.refetch();
  }

  function handleReportsRetry() {
    void summaryQuery.refetch();
  }

  function handleCreateOpen() {
    setCreateOpen(true);
  }

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open);
  }

  return (
    <PageWrapper
      title="Sign OS"
      subtitle="Envelopes, signatures, and completion status at a glance"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide"
      state={pageResolution(dashboardState, reportsState)}
      loading={<SignDashboardSkeleton />}
      onRetry={handleRetry}
      actions={
        dashboardState.kind === "loading" ? (
          <Skeleton className="h-9 w-36 rounded-md" />
        ) : canCreateEnvelope && data ? (
          <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" onClick={handleCreateOpen}>
            New envelope
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
        {dashboardState.kind === "ready" && data ? (
          <>
            <motion.div variants={fadeUp}>
              <StatCardGrid cols={5}>
                <StatCard label="Awaiting me" value={data.awaitingMe} icon={Inbox} tone="blue" />
                <StatCard label="Sent, pending signature" value={data.sentPending} icon={Send} tone="amber" />
                <StatCard label="Completed this month" value={data.completedThisMonth} icon={CheckCircle2} tone="emerald" />
                <StatCard label="Expiring soon" value={data.expiringSoon} icon={Clock} tone="amber" />
                <StatCard label="Failed / bounced" value={data.failedOrBounced} icon={AlertTriangle} tone="red" />
              </StatCardGrid>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className={canCreateEnvelope ? "grid gap-4 md:grid-cols-3" : "grid gap-4 md:grid-cols-2"}
            >
              {canCreateEnvelope ? (
                <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={handleCreateOpen}>
                  <CardContent className="flex items-center gap-3 pt-6">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <UploadCloud className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Upload &amp; send</p>
                      <p className="text-sm text-muted-foreground">Start a new envelope from a PDF</p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
              <Link href="/sign/templates">
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <FileStack className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Browse templates</p>
                      <p className="text-sm text-muted-foreground">Reuse a saved envelope layout</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/sign/bulk-send">
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 pt-6">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Send className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Bulk send</p>
                      <p className="text-sm text-muted-foreground">Send one template to many people</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.recentActivity.length === 0 ? (
                    <EmptyState
                      title="No activity yet"
                      description="Envelope events show up here as people sign, decline, or receive a request."
                      className="h-full min-h-full flex-1"
                    />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {data.recentActivity.map((event) => (
                        <li key={event.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 text-sm last:border-0 last:pb-0">
                          <span className="text-foreground">{formatEventType(event.eventType)}</span>
                          <span className="shrink-0 text-sm text-muted-foreground">
                            {event.actorName ?? "System"} · {formatDateTimeInOrgTz(event.createdAt, orgTimeZone)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        ) : null}

        {dashboardState.kind === "loading" ? <SignDashboardSkeleton includeReports={false} /> : null}
        <SectionFallback resolution={dashboardState} onRetry={handleDashboardRetry} />

        {reportsState.kind === "ready" && summary ? (
          <motion.div variants={fadeUp}>
            <SignReportsPanels data={summary} />
          </motion.div>
        ) : null}
        {reportsState.kind === "loading" ? <SignReportsSkeleton /> : null}
        <SectionFallback resolution={reportsState} onRetry={handleReportsRetry} />
      </motion.div>

      {canCreateEnvelope && data ? (
        <CreateEnvelopeDialog open={createOpen} onOpenChange={handleCreateOpenChange} />
      ) : null}
    </PageWrapper>
  );
}
