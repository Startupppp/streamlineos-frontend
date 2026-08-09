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
import {
  CONTENT_FILL_PANEL,
  ContentFillPanel,
} from "@/components/ui/content-fill-panel";
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
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";

const STATUS_CHIP: Record<
  HrWorkflowInstanceStatus,
  { label: string; icon: ReactNode; className: string }
> = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-3 w-3" />,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  in_progress: {
    label: "In Progress",
    icon: <Clock className="h-3 w-3" />,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="h-3 w-3" />,
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground border-border",
  },
  reopened: {
    label: "Reopened",
    icon: <Clock className="h-3 w-3" />,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
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
  const isOverdue =
    instance.dueAt &&
    new Date(instance.dueAt) < new Date() &&
    instance.status === "in_progress";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/30 cursor-pointer group transition-colors"
      onClick={() => onOpen(instance.id)}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <span className="text-sm font-medium">
            {HR_WORKFLOW_OBJECT_TYPE_LABELS[instance.objectType]}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] gap-0.5 ${chip.className}`}
          >
            {chip.icon}
            {chip.label}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px]">
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
              <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-300">
                <Clock className="h-2.5 w-2.5" />
                Due {new Date(instance.dueAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
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

export default function ApprovalsPage() {
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(
    null,
  );
  const [delegationOpen, setDelegationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const { data: inboxData, isLoading: inboxLoading } = useWorkflowInbox();
  const { data: actedData, isLoading: actedLoading } = useWorkflowActed(1, 50, {
    enabled: activeTab === "acted",
  });

  const inbox = inboxData?.data ?? [];
  const acted = actedData?.data ?? [];

  function handleClose() {
    setSelectedInstanceId(null);
  }

  return (
    <PageWrapper
      title="Approvals"
      subtitle="Review and act on pending approval requests"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDelegationOpen(true)}
          className="gap-1.5"
        >
          <UserCheck className="h-4 w-4" />
          My Delegations
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
                      className="text-[10px] h-4 px-1.5 leading-none"
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
            <InstanceList
              instances={inbox}
              isLoading={inboxLoading}
              onOpen={setSelectedInstanceId}
              showActions
              emptyTitle="No pending approvals"
              emptyDescription="You are all caught up. New approval requests will appear here."
            />
          </TabsContent>

          <TabsContent value="acted" className="flex min-h-0 flex-1 flex-col">
            <InstanceList
              instances={acted}
              isLoading={actedLoading}
              onOpen={setSelectedInstanceId}
              showActions={false}
              emptyTitle="No actions yet"
              emptyDescription="Requests you have approved or rejected will appear here."
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      <InstanceDetailSheet
        instanceId={selectedInstanceId}
        onClose={handleClose}
        showActions
      />

      <DelegationSettings
        open={delegationOpen}
        onOpenChange={setDelegationOpen}
      />
    </PageWrapper>
  );
}
