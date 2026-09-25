"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import {
  CONTENT_FILL_PANEL,
  ContentFillPanel,
} from "@/components/ui/content-fill-panel";
import { formatShortDate } from "@/lib/date-utils";
import {
  useWorkflowInbox,
  useWorkflowActed,
} from "@/hooks/api/hr/hr-workflows";
import { InstanceDetailSheet } from "@/features/hr/workflows/instance-detail-sheet";
import { DelegationSettings } from "@/features/hr/workflows/delegation-settings";
import {
  HR_WORKFLOW_OBJECT_TYPE_LABELS,
  type HrWorkflowInstance,
  type HrWorkflowInstanceStatus,
} from "@/types/hr/workflows";
import { getUserDisplayName } from "@/lib/person-display";
import { activationProps } from "@/lib/keyboard-activation";
import { currentStepRouting } from "@/features/hr/workflows/step-routing";
import { PendingLeaveApprovals } from "@/features/hr/workflows/pending-leave-approvals";
import { useHrLeaveApprovals } from "@/hooks/api/hr";

const STATUS_CHIP: Record<
  HrWorkflowInstanceStatus,
  { label: string; icon: ReactNode; className: string }
> = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
  in_progress: {
    label: "In Progress",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground border-border",
  },
  reopened: {
    label: "Reopened",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
};

function formatAge(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / 3600_000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function InstanceRow({
  instance,
  onOpen,
  showActions,
}: {
  instance: HrWorkflowInstance;
  onOpen: (id: number) => void;
  showActions: boolean;
}) {
  const chip = STATUS_CHIP[instance.status];
  const routing = currentStepRouting(instance);
  const isOverdue =
    instance.dueAt &&
    new Date(instance.dueAt) < new Date() &&
    instance.status === "in_progress";

  function handleClick(): void {
    onOpen(instance.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/30 cursor-pointer group transition-colors"
      {...activationProps(handleClick)}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <span className="text-sm font-medium">
            {HR_WORKFLOW_OBJECT_TYPE_LABELS[instance.objectType]}
          </span>
          <Badge
            variant="outline"
            className={`text-micro gap-0.5 ${chip.className}`}
          >
            {chip.icon}
            {chip.label}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-micro">
              Overdue
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-muted-foreground">
          <span>
            By{" "}
            {instance.requester
              ? getUserDisplayName(instance.requester)
              : (instance.requesterName ?? instance.requestedBy)}
          </span>
          <span>·</span>
          <span>Step {instance.currentStepOrder}</span>
          <span>·</span>
          <span>{formatAge(instance.createdAt)}</span>
          {instance.dueAt && !isOverdue && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-status-warning-ink">
                <Clock className="h-2.5 w-2.5" />
                Due {formatShortDate(instance.dueAt)}
              </span>
            </>
          )}
        </div>
        {routing && showActions ? (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {routing.rungLabel ? `${routing.rungLabel}: ` : ""}
            {routing.explanation}
            {routing.escalationLabel ? ` Escalates to the ${routing.escalationLabel} when overdue.` : ""}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {showActions && (
          <span className="text-xs text-muted-foreground">Click to review</span>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </motion.div>
  );
}

function InstanceList({
  instances,
  isLoading,
  onOpen,
  showActions,
  emptyTitle,
  emptyDescription,
}: {
  instances: HrWorkflowInstance[];
  isLoading: boolean;
  onOpen: (id: number) => void;
  showActions: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (isLoading) {
    return (
      <ContentFillPanel className="gap-2 p-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </ContentFillPanel>
    );
  }

  if (!instances.length) {
    return (
      <EmptyState
        illustrationPreset="approval"
        title={emptyTitle}
        description={emptyDescription}
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <ContentFillPanel className="gap-2 p-3">
      {instances.map((instance) => (
        <InstanceRow
          key={instance.id}
          instance={instance}
          onOpen={onOpen}
          showActions={showActions}
        />
      ))}
    </ContentFillPanel>
  );
}

export function HrApprovalsPage() {
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
  const [delegationOpen, setDelegationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [actedCursorHistory, setActedCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const actedPage = actedCursorHistory.length;
  const actedCursor = actedCursorHistory.at(-1);

  const { data: inboxData, isLoading: inboxLoading, isError: inboxError, refetch: refetchInbox } = useWorkflowInbox();
  const {
    data: actedData,
    isLoading: actedLoading,
    isFetching: actedFetching,
    isError: actedError,
    refetch: refetchActed,
  } = useWorkflowActed(
    { cursor: actedCursor, limit: 50 },
    { enabled: activeTab === "acted" },
  );

  const inbox = inboxData?.data ?? [];
  const acted = actedData?.data ?? [];

  // HRMS-E2E-013. The page used to claim "You are all caught up" from the
  // workflow inbox alone, while pending leave sat in a different table on a
  // different permission key. The claim now has to hold for both sources.
  const { data: leaveData } = useHrLeaveApprovals({ status: "PENDING", limit: 50 });
  const pendingLeaveCount = (leaveData?.pages ?? []).reduce(
    (total, page) => total + page.data.length,
    0,
  );

  function handleCloseDetail(): void {
    setSelectedInstanceId(null);
  }

  function handleRetryInbox(): void {
    void refetchInbox();
  }

  function handleRetryActed(): void {
    void refetchActed();
  }

  function handlePreviousActedPage(): void {
    setActedCursorHistory((history) =>
      history.length > 1 ? history.slice(0, -1) : history,
    );
  }

  function handleNextActedPage(): void {
    const nextCursor = actedData?.pagination.nextCursor;
    if (nextCursor)
      setActedCursorHistory((history) => [...history, nextCursor]);
  }

  function handleOpenDelegation(): void {
    setDelegationOpen(true);
  }

  return (
    <PageWrapper
      title="Approvals"
      subtitle="Review and act on pending approval requests"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenDelegation}
          className="gap-1.5"
        >
          <UserCheck className="h-4 w-4" />
          My delegations
        </Button>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <PageTabsToolbar
            tabsDensity="labeled"
            tabs={
              <TabsList>
                <TabsTrigger value="pending" className="gap-1.5">
                  Pending
                  {inbox.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-micro h-4 px-1.5 leading-none"
                    >
                      {inbox.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="acted">Acted</TabsTrigger>
              </TabsList>
            }
          />

          <TabsContent value="pending" className="flex min-h-0 flex-1 flex-col">
            {inboxError ? (
              <ErrorState
                className="flex-1"
                title="Couldn't load approvals"
                description="Failed to load your pending approvals. Please try again."
                onRetry={handleRetryInbox}
              />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <PendingLeaveApprovals />
                {pendingLeaveCount > 0 && inbox.length === 0 && !inboxLoading ? null : (
                  <InstanceList
                    instances={inbox}
                    isLoading={inboxLoading}
                    onOpen={setSelectedInstanceId}
                    showActions
                    emptyTitle="No pending approvals"
                    emptyDescription="You are all caught up. New approval requests will appear here."
                  />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="acted" className="flex min-h-0 flex-1 flex-col">
            {actedError ? (
              <ErrorState
                className="flex-1"
                title="Couldn't load history"
                description="Failed to load acted approvals. Please try again."
                onRetry={handleRetryActed}
              />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <InstanceList
                  instances={acted}
                  isLoading={actedLoading}
                  onOpen={setSelectedInstanceId}
                  showActions={false}
                  emptyTitle="No actions yet"
                  emptyDescription="Requests you have approved or rejected will appear here."
                />
                {actedData && (actedPage > 1 || actedData.pagination.hasMore) ? (
                  <CursorPageControls
                    page={actedPage}
                    hasNext={actedData.pagination.hasMore}
                    disabled={actedFetching}
                    onPrevious={handlePreviousActedPage}
                    onNext={handleNextActedPage}
                  />
                ) : null}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <InstanceDetailSheet
        instanceId={selectedInstanceId}
        onClose={handleCloseDetail}
        showActions
      />

      <DelegationSettings
        open={delegationOpen}
        onOpenChange={setDelegationOpen}
      />
    </PageWrapper>
  );
}
