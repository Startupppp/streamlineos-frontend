"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Play, Archive, Copy, Trash2, Settings2, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import {
  useHrWorkflowDefinitions,
  useActivateWorkflow,
  useArchiveWorkflow,
  useDuplicateWorkflow,
  useDeleteWorkflow,
  useHrWorkflowDefinition,
} from "@/hooks/api/hr/hr-workflows";
import { WorkflowUpsertSheet } from "@/features/hr/workflows/workflow-upsert-sheet";
import { WorkflowSimulateDialog } from "@/features/hr/workflows/workflow-simulate-dialog";
import {
  HR_WORKFLOW_OBJECT_TYPES,
  HR_WORKFLOW_OBJECT_TYPE_LABELS,
  type HrWorkflowDefinition,
  type HrWorkflowObjectType,
  type HrWorkflowStatus,
} from "@/types/hr/workflows";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const HR_WORKFLOW_STATUSES = [
  "draft",
  "active",
  "archived",
] as const satisfies readonly HrWorkflowStatus[];

const STATUS_BADGE: Record<HrWorkflowStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", className: "bg-status-success-surface text-status-success-ink" },
  archived: { label: "Archived", className: "bg-status-warning-surface text-status-warning-ink" },
};

export function WorkflowsSettingsPage() {
  const canManage = useCan("hr:workflows:manage");
  const canView = useCan("hr:workflows:view");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const { data: editDefinition } = useHrWorkflowDefinition(editId);
  const [simulateTarget, setSimulateTarget] = useState<HrWorkflowDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HrWorkflowDefinition | null>(null);
  const [filterObjectType, setFilterObjectType] = useState<HrWorkflowObjectType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<HrWorkflowStatus | "all">("all");

  const { data, isLoading, isError, error, refetch } = useHrWorkflowDefinitions({
    objectType: filterObjectType === "all" ? undefined : filterObjectType,
    status: filterStatus === "all" ? undefined : filterStatus,
  });

  const activate = useActivateWorkflow();
  const archive = useArchiveWorkflow();
  const duplicate = useDuplicateWorkflow();
  const deleteWf = useDeleteWorkflow();

  function handleRetry() {
    void refetch();
  }

  function handleObjectTypeFilterChange(v: string) {
    const next = v === "all" ? "all" : HR_WORKFLOW_OBJECT_TYPES.find((candidate) => candidate === v);
    if (next) setFilterObjectType(next);
  }

  function handleStatusFilterChange(v: string) {
    const next = v === "all" ? "all" : HR_WORKFLOW_STATUSES.find((candidate) => candidate === v);
    if (next) setFilterStatus(next);
  }

  function handleOpenCreate() {
    setEditId(null);
    setSheetOpen(true);
  }

  function handleEdit(def: HrWorkflowDefinition) {
    setEditId(def.id);
    setSheetOpen(true);
  }

  function handleActivate(id: number) {
    activate.mutate(id, {
      onSuccess: () => toast.success("Workflow activated"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleArchive(id: number) {
    archive.mutate(id, {
      onSuccess: () => toast.success("Workflow archived"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleDuplicate(id: number) {
    duplicate.mutate(id, {
      onSuccess: () => toast.success("Workflow duplicated"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteWf.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Workflow "${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleClearFilters() {
    setFilterObjectType("all");
    setFilterStatus("all");
  }

  function handleSimulateOpenChange(open: boolean) {
    if (!open) setSimulateTarget(null);
  }

  const definitions = data?.data ?? [];
  const isFiltered = filterObjectType !== "all" || filterStatus !== "all";
  // FE-40/47: without hr:workflows:view the list read is disabled, which used to
  // render "No workflows configured" plus a no-op "Request Access" button.
  const pageState = usePageState({
    permission: "hr:workflows:view",
    isLoading,
    isError,
    error,
    isEmpty: definitions.length === 0,
  });
  const actionPending = activate.isPending || archive.isPending || duplicate.isPending;

  return (
    <PageWrapper
      title="Workflow Settings"
      subtitle="Configure approval chains for HR processes"
      actions={
        canManage ? (
          <Button onClick={handleOpenCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Workflow
          </Button>
        ) : undefined
      }
      filters={
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={filterObjectType}
            onValueChange={handleObjectTypeFilterChange}
          >
            <SelectTrigger className={cn("w-48", FILTER_SELECT_TRIGGER)}>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {HR_WORKFLOW_OBJECT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{HR_WORKFLOW_OBJECT_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterStatus}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <PageState
          resolution={pageState}
          onRetry={handleRetry}
          loading={
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          }
          empty={
            isFiltered ? (
              <EmptyState
                illustrationPreset="documents"
                title="No workflows match these filters"
                description="Try changing or clearing the filters to see your workflows"
                action={{ label: "Clear Filters", onClick: handleClearFilters }}
              />
            ) : (
              <EmptyState
                illustrationPreset="documents"
                title="No workflows configured"
                description="Create approval chains to route HR requests through the right approvers. Common workflows include leave approval, expense approval, onboarding approval, and document approval."
                action={canManage ? { label: "Create Workflow", onClick: handleOpenCreate } : undefined}
              />
            )
          }
        >
          <div className="space-y-2">
            {definitions.map((def) => {
              const statusCfg = STATUS_BADGE[def.status];
              return (
                <div
                  key={def.id}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TruncatedText text={def.name} className="text-sm font-medium" />
                      {def.isDefault && (
                        <Badge variant="secondary" className="text-micro">Default</Badge>
                      )}
                      <Badge className={`text-micro ${statusCfg.className}`}>{statusCfg.label}</Badge>
                      <span className="text-xs text-muted-foreground">v{def.version}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{HR_WORKFLOW_OBJECT_TYPE_LABELS[def.objectType]}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{def.stepCount ?? 0} steps</span>
                    </div>
                  </div>

                  {(canManage || canView) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 shrink-0" aria-label="Workflow Actions">
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-sm">
                        {canView && (
                          <DropdownMenuItem onClick={() => setSimulateTarget(def)}>
                            <FlaskConical className="h-3.5 w-3.5 mr-2" />
                            Simulate
                          </DropdownMenuItem>
                        )}
                        {canManage && def.status === "draft" && (
                          <DropdownMenuItem onClick={() => handleEdit(def)}>
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canManage && def.status === "draft" && (
                          <DropdownMenuItem disabled={actionPending} onClick={() => handleActivate(def.id)}>
                            <Play className="h-3.5 w-3.5 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        {canManage && def.status === "active" && (
                          <DropdownMenuItem disabled={actionPending} onClick={() => handleArchive(def.id)}>
                            <Archive className="h-3.5 w-3.5 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <DropdownMenuItem disabled={actionPending} onClick={() => handleDuplicate(def.id)}>
                            <Copy className="h-3.5 w-3.5 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                        )}
                        {canManage && def.status !== "active" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(def)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        </PageState>
      </motion.div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete workflow?"
        description={`"${deleteTarget?.name ?? ""}" will be permanently deleted. Requests already routed by it keep their history.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteWf.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmDelete}
      />

      <WorkflowUpsertSheet
        open={sheetOpen && (editId === null || editDefinition !== undefined)}
        onOpenChange={setSheetOpen}
        editDefinition={editId !== null ? editDefinition ?? null : null}
      />

      <WorkflowSimulateDialog
        workflowId={simulateTarget?.id ?? null}
        workflowName={simulateTarget?.name}
        open={simulateTarget !== null}
        onOpenChange={handleSimulateOpenChange}
      />
    </PageWrapper>
  );
}
