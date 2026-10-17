"use client";

import {
  CalendarOff,
  UserMinus,
  FileWarning,
  Home as HomeIcon,
  Clock as ClockIcon,
  ClipboardList as ClipboardListIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSectionHeader } from "@/features/hr/shared/hr-ui";
import { hubSectionData, hubSectionError } from "@/hooks/api/hr/hub";
import type { HrHubViewProps } from "@/hooks/api/hr/hub-types";
import { HrQueueCard, OpsInboxCard, resolveQueueTone } from "./queues/queue-cards";

export function HrHubQueues({
  access,
  snapshot,
  isLoading,
  onRetry,
}: HrHubViewProps) {
  const sections = snapshot?.sections;
  const metrics = hubSectionData(sections?.dashboardMetrics);
  const wfh = hubSectionData(sections?.pendingWfh);
  const probation = hubSectionData(sections?.probation);
  const resignations = hubSectionData(sections?.resignations);
  const docStats = hubSectionData(sections?.documentStats);
  const onboarding = hubSectionData(sections?.onboardingStatus);

  const hasAnyQueue =
    (access.canAnalytics && access.canLeavesApprove) ||
    access.canAttendanceManage ||
    access.canProbation ||
    access.canExit ||
    access.canCases ||
    access.canDocuments ||
    (access.canAnalytics && access.canOnboarding);

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-3.5 w-52 rounded-md" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasAnyQueue) return null;

  const probationDue = (probation?.data ?? []).filter(
    (review) => review.status === "review_due",
  ).length;
  const pendingLeaves = metrics?.pendingLeaveRequests ?? 0;
  const wfhCount = (wfh ?? []).length;
  const resignationCount = resignations?.count ?? 0;
  const docsExpiring = docStats?.expiringIn30Days ?? 0;
  const onboardingInProgress = onboarding?.inProgress ?? 0;

  return (
    <div className="space-y-2.5">
      <HrSectionHeader title="Needs you" description="Items waiting for your action" />
      <OpsInboxCard
        access={access}
        section={sections?.opsInbox}
        isLoading={isLoading}
        onRetry={onRetry}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {access.canAnalytics && access.canLeavesApprove && (
          <HrQueueCard
            icon={CalendarOff}
            label="Pending leave requests"
            count={pendingLeaves}
            context="Awaiting approval"
            href="/hr/leaves"
            isLoading={isLoading}
            isError={Boolean(hubSectionError(sections?.dashboardMetrics))}
            onRetry={onRetry}
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
            isLoading={isLoading}
            isError={Boolean(hubSectionError(sections?.pendingWfh))}
            onRetry={onRetry}
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
            isLoading={isLoading}
            isError={Boolean(hubSectionError(sections?.probation))}
            onRetry={onRetry}
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
            isLoading={isLoading}
            isError={Boolean(hubSectionError(sections?.resignations))}
            onRetry={onRetry}
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
            isLoading={isLoading}
            isError={Boolean(hubSectionError(sections?.documentStats))}
            onRetry={onRetry}
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
            isLoading={isLoading}
            isError={Boolean(hubSectionError(sections?.onboardingStatus))}
            onRetry={onRetry}
            tone="neutral"
          />
        )}
      </div>
    </div>
  );
}
