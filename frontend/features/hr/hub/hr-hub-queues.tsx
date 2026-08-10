"use client";

import {
  CalendarOff,
  UserMinus,
  FileWarning,
  Home as HomeIcon,
  Clock as ClockIcon,
  ClipboardList as ClipboardListIcon,
} from "lucide-react";
import {
  useHrDashboardMetrics,
  useHrPendingWfhRequests,
  useProbationList,
  useResignations,
  useHrOnboardingStatus,
  useHrDocumentStats,
} from "@/hooks/api/hr";
import { HrSectionHeader } from "@/features/hr/shared/hr-ui";
import { HUB_RESIGNATIONS_PARAMS, type HrHubAccess } from "./use-hr-hub-access";
import { HrQueueCard, OpsInboxCard, resolveQueueTone } from "./queues/queue-cards";

interface HrHubQueuesProps {
  access: HrHubAccess;
}

export function HrHubQueues({ access }: HrHubQueuesProps) {
  const metrics = useHrDashboardMetrics();
  const wfh = useHrPendingWfhRequests({ enabled: access.canAttendanceManage });
  const probation = useProbationList();
  const resignations = useResignations(HUB_RESIGNATIONS_PARAMS);
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
