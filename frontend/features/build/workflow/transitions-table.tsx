"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  useWorkflowTransitions,
  useCreateTransition,
  useUpdateTransition,
  useDeleteTransition,
} from "@/hooks/api/build/workflow";
import { useCan } from "@/hooks/api/access";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TransitionFormSheet } from "./transition-form-sheet";
import type { CustomState } from "@/hooks/api/build/custom-states";
import type { WorkflowTransition, CreateTransitionInput } from "@/types/projects/workflow";
import { getErrorMessage } from "@/lib/get-error-message";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import {
  TRANSITION_TABLE_HEADERS,
  AddTransitionButton,
  TransitionRowActions,
  buildTransitionColumns,
} from "./transition-table-parts";

interface TransitionsTableProps {
  projectId: number;
  statuses: CustomState[];
  transitions?: WorkflowTransition[];
  isTransitionsLoading?: boolean;
  sheetOpen?: boolean;
  editTarget?: WorkflowTransition | null;
  onSheetOpenChange?: (open: boolean) => void;
  onEditTargetChange?: (target: WorkflowTransition | null) => void;
}

export function TransitionsTable({
  projectId,
  statuses,
  transitions: externalTransitions,
  isTransitionsLoading: externalIsLoading,
  sheetOpen: externalSheetOpen,
  editTarget: externalEditTarget,
  onSheetOpenChange,
  onEditTargetChange,
}: TransitionsTableProps) {
  const canManage = useCan("build:workflow:manage");
  const { data: ownTransitions, isLoading: ownIsLoading, isError: ownIsError, error: ownError, refetch } = useWorkflowTransitions(projectId);
  const createTransition = useCreateTransition(projectId);
  const updateTransition = useUpdateTransition(projectId);
  const deleteTransition = useDeleteTransition(projectId);

  const [internalSheetOpen, setInternalSheetOpen] = useState(false);
  const [internalEditTarget, setInternalEditTarget] = useState<WorkflowTransition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowTransition | null>(null);

  const transitions = externalTransitions ?? (ownTransitions ?? []);
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : ownIsLoading;
  const isError = externalTransitions === undefined ? ownIsError : false;
  const error = externalTransitions === undefined ? ownError : undefined;
  const sheetOpen = externalSheetOpen !== undefined ? externalSheetOpen : internalSheetOpen;
  const editTarget = externalEditTarget !== undefined ? externalEditTarget : internalEditTarget;
  const setSheetOpen = onSheetOpenChange ?? setInternalSheetOpen;
  const setEditTarget = onEditTargetChange ?? setInternalEditTarget;

  const getTransitionRowKey = (row: WorkflowTransition) => row.id;

  const statusMap = new Map(statuses.map((s) => [s.id, s.name]));

  function resolveStatusName(id: number | null): string {
    if (id === null) return "Any";
    return statusMap.get(id) ?? String(id);
  }

  function handleAddClick() {
    setEditTarget(null);
    setSheetOpen(true);
  }

  function handleEditClick(t: WorkflowTransition) {
    setEditTarget(t);
    setSheetOpen(true);
  }

  function handleSubmit(data: CreateTransitionInput) {
    if (editTarget) {
      updateTransition.mutate(
        { transitionId: editTarget.id, ...data },
        {
          onSuccess: () => {
            toast.success("Transition updated");
            setSheetOpen(false);
            setEditTarget(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      createTransition.mutate(data, {
        onSuccess: () => {
          toast.success("Transition added");
          setSheetOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteTransition.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Transition deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRetry() {
    void refetch();
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function renderTransitionMobileCard(row: WorkflowTransition) {
    return (
      <div className="flex items-start justify-between gap-2 px-3 py-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={row.fromStatusId === null ? "secondary" : "outline"} className="text-xs">
              {resolveStatusName(row.fromStatusId)}
            </Badge>
            <span className="text-xs text-muted-foreground">→</span>
            <Badge variant="outline" className="text-xs">
              {resolveStatusName(row.toStatusId)}
            </Badge>
          </div>
          {row.name ? (
            <p className="text-sm font-medium text-foreground">{row.name}</p>
          ) : null}
          {row.requiresApproval ? (
            <Badge variant="secondary" className="text-micro">Approval required</Badge>
          ) : null}
        </div>
        {canManage ? (
          <TransitionRowActions
            transition={row}
            onEdit={handleEditClick}
            onDelete={setDeleteTarget}
          />
        ) : null}
      </div>
    );
  }

  const columns = buildTransitionColumns({
    resolveStatusName,
    canManage,
    onEdit: handleEditClick,
    onDelete: setDeleteTarget,
  });

  return (
    <>
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2 px-4 pt-4">
        <h2 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>Transitions</h2>
        {canManage ? <AddTransitionButton onClick={handleAddClick} /> : null}
      </div>

      <BuildListSurface<WorkflowTransition>
        permission="build:workflow:view"
        rows={transitions}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        error={error}
        getRowKey={getTransitionRowKey}
        mobileCard={renderTransitionMobileCard}
        minWidth="680px"
        tableClassName="border-0"
        compact
        loading={<DataTableSkeleton rows={12} headers={TRANSITION_TABLE_HEADERS} className="px-4 pb-4" mobileCards />}
        empty={
          <EmptyState
            illustrationPreset="projects"
            compact
            title="No transitions defined"
            description="All status changes are currently unrestricted. Add a transition to enforce your workflow."
            action={canManage ? { label: "Add transition", onClick: handleAddClick } : undefined}
            className="px-4 pb-4"
          />
        }
        onRetry={handleRetry}
      />

      <TransitionFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        onSubmit={handleSubmit}
        isPending={createTransition.isPending || updateTransition.isPending}
        statuses={statuses}
        transition={editTarget ?? undefined}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete this transition?"
        description="This will remove the transition rule. Existing items are not affected."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
