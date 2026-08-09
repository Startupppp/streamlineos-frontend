"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AlertCircle,
  RefreshCcw,
  CalendarOff,
  UserMinus,
  FileWarning,
  Home as HomeIcon,
  Clock as ClockIcon,
  ClipboardList as ClipboardListIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useHrDashboardMetrics,
  useHrPendingWfhRequests,
  useProbationList,
  useResignations,
  useHrOnboardingStatus,
  useHrDocumentStats,
} from "@/hooks/api/hr";
import { useServiceDeliveryOpsInbox } from "@/hooks/api/hr/service-delivery";
import { HrIconWell, HrSectionHeader } from "@/features/hr/shared/hr-ui";
import type { HrHubAccess } from "./use-hr-hub-access";

type QueueTone = "red" | "amber" | "neutral";

function resolveQueueTone(count: number, critical = false): QueueTone {
  if (count === 0) return "neutral";
  return critical ? "red" : "amber";
}

const TONE_BADGE: Record<QueueTone, string> = {
  red: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  neutral: "bg-muted text-muted-foreground",
};

interface HrQueueCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  count: number;
  context: string;
  href: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  tone: QueueTone;
}

function HrQueueCard({
  icon: Icon,
  label,
  count,
  context,
  href,
  isLoading,
  isError,
  onRetry,
  tone,
}: HrQueueCardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
        <Skeleton className="h-6 w-8 rounded-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
        <HrIconWell tone="slate" size="sm">
          <AlertCircle className="h-3.5 w-3.5" />
        </HrIconWell>
        <p className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
          {label} — {getErrorMessage(new Error("unavailable"))}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-[10px] text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-0.5"
        >
          <RefreshCcw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <HrIconWell
        tone={tone === "red" ? "rose" : tone === "amber" ? "amber" : "slate"}
        size="sm"
      >
        <Icon className="h-3.5 w-3.5" />
      </HrIconWell>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{context}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={cn(
            "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-bold",
            TONE_BADGE[tone],
          )}
        >
          {count}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function OpsInboxCard({ access }: { access: HrHubAccess }) {
  const { data, isLoading, isError, refetch } = useServiceDeliveryOpsInbox(access.canCases);

  const handleRetry = () => { void refetch(); };

  if (!access.canCases) return null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-4">
        <p className="text-xs text-muted-foreground flex-1">
          {getErrorMessage(new Error("Ops inbox unavailable"))}
        </p>
        <Button size="sm" variant="ghost" onClick={handleRetry} className="h-7 text-xs">
          Retry
        </Button>
      </div>
    );
  }

  const totals = data?.totals;
  if (!totals) return null;

  const total = (totals.cases ?? 0) + (totals.safety ?? 0) + (totals.helpdesk ?? 0);
  const isCritical = (totals.criticalAging ?? 0) > 0 || (totals.slaBreached ?? 0) > 0;
  const tone = resolveQueueTone(total, isCritical);

  return (
    <Link
      href="/hr/service-delivery"
      className="group block rounded-xl border border-border/70 bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-sm font-semibold text-foreground">Service delivery inbox</p>
        <span
          className={cn(
            "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-bold",
            TONE_BADGE[tone],
          )}
        >
          {total}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(totals.cases ?? 0) > 0 && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {totals.cases} cases
          </span>
        )}
        {(totals.safety ?? 0) > 0 && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
            {totals.safety} safety
          </span>
        )}
        {(totals.helpdesk ?? 0) > 0 && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {totals.helpdesk} helpdesk
          </span>
        )}
        {(totals.criticalAging ?? 0) > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
            {totals.criticalAging} critical
          </span>
        )}
        {(totals.slaBreached ?? 0) > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            {totals.slaBreached} SLA breached
          </span>
        )}
        {total === 0 && (
          <span className="text-[10px] text-muted-foreground">Nothing needs attention</span>
        )}
      </div>
    </Link>
  );
}

interface HrHubQueuesProps {
  access: HrHubAccess;
}

export function HrHubQueues({ access }: HrHubQueuesProps) {
  const metrics = useHrDashboardMetrics();
  const wfh = useHrPendingWfhRequests({ enabled: access.canAttendanceManage });
  const probation = useProbationList();
  const resignations = useResignations({ limit: 1 });
  const docStats = useHrDocumentStats({ enabled: access.canDocuments });
  const onboarding = useHrOnboardingStatus();

  const hasAnyQueue =
    (access.canAnalytics && access.canLeavesApprove) ||
    access.canAttendanceManage ||
    access.canProbation ||
    access.canExit ||
    access.canCases ||
    access.canDocuments ||
    (access.canAnalytics && access.canOnboarding);

  if (!hasAnyQueue) return null;

  const probationDue = (probation.data ?? []).filter(p => p.status === "review_due").length;
  const pendingLeaves = metrics.data?.pendingLeaveRequests ?? 0;
  const wfhCount = (wfh.data ?? []).length;
  const resignationCount = resignations.data?.pagination.total ?? 0;
  const docsExpiring = docStats.data?.expiringIn30Days ?? 0;
  const onboardingInProgress = onboarding.data?.inProgress ?? 0;

  const handleMetricsRetry = () => { void metrics.refetch(); };
  const handleWfhRetry = () => { void wfh.refetch(); };
  const handleProbationRetry = () => { void probation.refetch(); };
  const handleResignationsRetry = () => { void resignations.refetch(); };
  const handleDocStatsRetry = () => { void docStats.refetch(); };
  const handleOnboardingRetry = () => { void onboarding.refetch(); };

  return (
    <div className="space-y-2.5">
      <HrSectionHeader title="Needs you" description="Items waiting for your action" />
      <OpsInboxCard access={access} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {access.canAnalytics && access.canLeavesApprove && (
          <HrQueueCard
            icon={CalendarOff}
            label="Pending leave requests"
            count={pendingLeaves}
            context="Awaiting approval"
            href="/hr/leaves"
            isLoading={metrics.isLoading}
            isError={metrics.isError}
            onRetry={handleMetricsRetry}
            tone={resolveQueueTone(pendingLeaves)}
          />
        )}
        {access.canAttendanceManage && (
          <HrQueueCard
            icon={HomeIcon}
            label="WFH pending"
            count={wfhCount}
            context="Requests to approve"
            href="/hr/attendance"
            isLoading={wfh.isLoading}
            isError={wfh.isError}
            onRetry={handleWfhRetry}
            tone={resolveQueueTone(wfhCount)}
          />
        )}
        {access.canProbation && (
          <HrQueueCard
            icon={ClockIcon}
            label="Probation reviews due"
            count={probationDue}
            context="Require confirmation"
            href="/hr/onboarding/probation"
            isLoading={probation.isLoading}
            isError={probation.isError}
            onRetry={handleProbationRetry}
            tone={resolveQueueTone(probationDue, probationDue > 3)}
          />
        )}
        {access.canExit && (
          <HrQueueCard
            icon={UserMinus}
            label="Active resignations"
            count={resignationCount}
            context="In exit pipeline"
            href="/hr/exit"
            isLoading={resignations.isLoading}
            isError={resignations.isError}
            onRetry={handleResignationsRetry}
            tone={resolveQueueTone(resignationCount)}
          />
        )}
        {access.canDocuments && (
          <HrQueueCard
            icon={FileWarning}
            label="Documents expiring"
            count={docsExpiring}
            context="Within 30 days"
            href="/hr/documents"
            isLoading={docStats.isLoading}
            isError={docStats.isError}
            onRetry={handleDocStatsRetry}
            tone={resolveQueueTone(docsExpiring, docsExpiring > 5)}
          />
        )}
        {access.canAnalytics && access.canOnboarding && (
          <HrQueueCard
            icon={ClipboardListIcon}
            label="Onboarding in progress"
            count={onboardingInProgress}
            context="New hires on track"
            href="/hr/onboarding"
            isLoading={onboarding.isLoading}
            isError={onboarding.isError}
            onRetry={handleOnboardingRetry}
            tone="neutral"
          />
        )}
      </div>
    </div>
  );
}
