"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, ArrowRight, UserCheck } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkflowInbox, useWorkflowActed } from "@/hooks/api/hr/hr-workflows";
import { InstanceDetailSheet } from "@/features/hr/workflows/instance-detail-sheet";
import { DelegationSettings } from "@/features/hr/workflows/delegation-settings";
import {
  HR_WORKFLOW_OBJECT_TYPE_LABELS,
  type HrWorkflowInstance,
  type HrWorkflowInstanceStatus,
} from "@/types/hr/workflows";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";

const STATUS_CHIP: Record<HrWorkflowInstanceStatus, { label: string; icon: ReactNode; className: string }> = {
  pending: { label: "Pending", icon: <Clock className="h-3 w-3" />, className: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "In Progress", icon: <Clock className="h-3 w-3" />, className: "bg-blue-50 text-blue-700 border-blue-200" },
  approved: { label: "Approved", icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", icon: <XCircle className="h-3 w-3" />, className: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", icon: <XCircle className="h-3 w-3" />, className: "bg-muted text-muted-foreground border-border" },
  reopened: { label: "Reopened", icon: <Clock className="h-3 w-3" />, className: "bg-purple-50 text-purple-700 border-purple-200" },
};

function formatAge(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / 3600_000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function InstanceRow({ instance, onOpen, showActions }: { instance: HrWorkflowInstance; onOpen: (id: number) => void; showActions: boolean }) {
  const chip = STATUS_CHIP[instance.status];
  const isOverdue = instance.dueAt && new Date(instance.dueAt) < new Date() && instance.status === "in_progress";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 cursor-pointer group transition-colors"
      onClick={() => onOpen(instance.id)}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{HR_WORKFLOW_OBJECT_TYPE_LABELS[instance.objectType]}</span>
          <Badge
            variant="outline"
            className={`text-[10px] gap-0.5 ${chip.className}`}
          >
            {chip.icon}
            {chip.label}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>By {instance.requester ? getUserDisplayName(instance.requester) : (instance.requesterName ?? instance.requestedBy)}</span>
          <span>·</span>
          <span>Step {instance.currentStepOrder}</span>
          <span>·</span>
          <span>{formatAge(instance.createdAt)}</span>
          {instance.dueAt && !isOverdue && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-amber-600">
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

function InstanceList({ instances, isLoading, onOpen, showActions, emptyTitle, emptyDescription }: {
  instances: HrWorkflowInstance[];
  isLoading: boolean;
  onOpen: (id: number) => void;
  showActions: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!instances.length) {
    return (
      <EmptyState
        illustrationPreset="approval"
        title={emptyTitle}
        description={emptyDescription}
        compact
        className="border-0 bg-transparent shadow-none h-48"
      />
    );
  }

  return (
    <div className="space-y-2">
      {instances.map((instance) => (
        <InstanceRow key={instance.id} instance={instance} onOpen={onOpen} showActions={showActions} />
      ))}
    </div>
  );
}

export default function ApprovalsPage() {
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
  const [delegationOpen, setDelegationOpen] = useState(false);

  const { data: inboxData, isLoading: inboxLoading } = useWorkflowInbox();
  const { data: actedData, isLoading: actedLoading } = useWorkflowActed();

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
        <Button variant="outline" size="sm" onClick={() => setDelegationOpen(true)} className="gap-1.5">
          <UserCheck className="h-4 w-4" />
          My Delegations
        </Button>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="gap-1.5">
              Pending
              {inbox.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{inbox.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="acted">Acted</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <InstanceList
              instances={inbox}
              isLoading={inboxLoading}
              onOpen={setSelectedInstanceId}
              showActions
              emptyTitle="No pending approvals"
              emptyDescription="You are all caught up. New approval requests will appear here."
            />
          </TabsContent>

          <TabsContent value="acted">
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

      <DelegationSettings open={delegationOpen} onOpenChange={setDelegationOpen} />
    </PageWrapper>
  );
}
