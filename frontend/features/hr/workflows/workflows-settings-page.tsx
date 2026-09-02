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
import { ErrorState } from "@/components/shared/error-state";
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

  function handleDelete(id: number) {
    deleteWf.mutate(id, {
      onSuccess: () => toast.success("Workflow deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  const definitions = data?.data ?? [];

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
          <Select value={filterObjectType} onValueChange={(v) => setFilterObjectType(v as HrWorkflowObjectType | "all")}>
            <SelectTrigger className={cn("w-48", FILTER_SELECT_TRIGGER)}>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {HR_WORKFLOW_OBJECT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{HR_WORKFLOW_OBJECT_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as HrWorkflowStatus | "all")}>
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
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <ErrorState
            className="flex-1"
            title="Couldn't load workflows"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        )}

        {!isLoading && !isError && definitions.length === 0 && (filterObjectType !== "all" || filterStatus !== "all") && (
          <EmptyState
            illustrationPreset="documents"
            title="No workflows match these filters"
            description="Try changing or clearing the filters to see your workflows"
            action={{ label: "Clear Filters", onClick: () => { setFilterObjectType("all"); setFilterStatus("all"); } }}
          />
        )}

        {!isLoading && !isError && definitions.length === 0 && filterObjectType === "all" && filterStatus === "all" && (
          <EmptyState
            illustrationPreset="documents"
            title="No workflows configured"
            description="Create approval chains to route HR requests through the right approvers. Common workflows include leave approval, expense approval, onboarding approval, and document approval."
            action={
              canManage
                ? { label: "Create Workflow", onClick: handleOpenCreate }
                : { label: "Request Access", onClick: () => {} }
            }
          />
        )}

        {!isLoading && !isError && definitions.length > 0 && (
          <div className="space-y-2">
            {definitions.map((def, idx) => {
              const statusCfg = STATUS_BADGE[def.status];
              return (
                <motion.div
                  key={def.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut", delay: idx * 0.04 }}
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
                          <DropdownMenuItem onClick={() => handleActivate(def.id)}>
                            <Play className="h-3.5 w-3.5 mr-2" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        {canManage && def.status === "active" && (
                          <DropdownMenuItem onClick={() => handleArchive(def.id)}>
                            <Archive className="h-3.5 w-3.5 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <DropdownMenuItem onClick={() => handleDuplicate(def.id)}>
                            <Copy className="h-3.5 w-3.5 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                        )}
                        {canManage && def.status !== "active" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(def.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <WorkflowUpsertSheet
        open={sheetOpen && (editId === null || editDefinition !== undefined)}
        onOpenChange={setSheetOpen}
        editDefinition={editId !== null ? editDefinition ?? null : null}
      />

      <WorkflowSimulateDialog
        workflowId={simulateTarget?.id ?? null}
        workflowName={simulateTarget?.name}
        open={simulateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSimulateTarget(null);
        }}
      />
    </PageWrapper>
  );
}
