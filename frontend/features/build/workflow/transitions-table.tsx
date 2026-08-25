"use client";

import { useCallback, useState } from "react";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import {
  useWorkflowTransitions,
  useCreateTransition,
  useUpdateTransition,
  useDeleteTransition,
} from "@/hooks/api/build/workflow";
import { useCan } from "@/hooks/api/access";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TransitionFormSheet } from "./transition-form-sheet";
import type { CustomState } from "@/hooks/api/build/custom-states";
import type { WorkflowTransition, CreateTransitionInput } from "@/types/projects/workflow";
import { getErrorMessage } from "@/lib/get-error-message";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

function AddTransitionButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      Add
    </Button>
  );
}

function TransitionRowActions({
  transition,
  onEdit,
  onDelete,
}: {
  transition: WorkflowTransition;
  onEdit: (t: WorkflowTransition) => void;
  onDelete: (t: WorkflowTransition) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(transition), [transition, onEdit]);
  const handleDelete = useCallback(() => onDelete(transition), [transition, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Transition actions" {...hoverHandlers}>
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TransitionsTableProps {
  projectId: number;
  statuses: CustomState[];
}

export function TransitionsTable({ projectId, statuses }: TransitionsTableProps) {
  const canManage = useCan("build:workflow:manage");
  const { data: transitions, isLoading } = useWorkflowTransitions(projectId);
  const createTransition = useCreateTransition(projectId);
  const updateTransition = useUpdateTransition(projectId);
  const deleteTransition = useDeleteTransition(projectId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkflowTransition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowTransition | null>(null);

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
        { id: editTarget.id, ...data },
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

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  const columns: DataTableColumn<WorkflowTransition>[] = [
    {
      key: "fromStatusId",
      header: "From",
      cell: (row) => (
        <Badge variant={row.fromStatusId === null ? "secondary" : "outline"} className="text-xs">
          {resolveStatusName(row.fromStatusId)}
        </Badge>
      ),
    },
    {
      key: "toStatusId",
      header: "To",
      cell: (row) => (
        <Badge variant="outline" className="text-xs">
          {resolveStatusName(row.toStatusId)}
        </Badge>
      ),
    },
    {
      key: "name",
      header: "Label",
      className: TABLE_TITLE_CELL,
      cell: (row) =>
        row.name ? (
          <TruncatedText text={row.name} className="text-sm font-medium" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "requiresApproval",
      header: "Approval",
      className: "w-24",
      cell: (row) =>
        row.requiresApproval ? (
          <Badge variant="secondary" className="text-micro">Required</Badge>
        ) : null,
    },
    {
      key: "requiredFields",
      header: "Required fields",
      cell: (row) =>
        row.requiredFields.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.requiredFields.map((f) => (
              <Badge key={f} variant="outline" className="text-micro font-mono">{f}</Badge>
            ))}
          </div>
        ) : null,
    },
    {
      key: "allowedRoles",
      header: "Allowed roles",
      cell: (row) =>
        row.allowedRoles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.allowedRoles.map((r) => (
              <Badge key={r} variant="outline" className="text-micro">{r}</Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">All roles</span>
        ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            className: "w-10",
            cell: (row: WorkflowTransition) => (
              <TransitionRowActions
                transition={row}
                onEdit={handleEditClick}
                onDelete={setDeleteTarget}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2 px-4 pt-4">
        <h2 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>Transitions</h2>
        {canManage ? <AddTransitionButton onClick={handleAddClick} /> : null}
      </div>

      {isLoading ? (
        <DataTableSkeleton rows={12} columns={6} className="px-4 pb-4" />
      ) : (transitions ?? []).length === 0 ? (
        <EmptyState
          illustrationPreset="projects"
          compact
          title="No transitions defined"
          description="All status changes are currently unrestricted. Add a transition to enforce your workflow."
          action={canManage ? { label: "Add transition", onClick: handleAddClick } : undefined}
          className="px-4 pb-4"
        />
      ) : (
        <DataTable
          data={transitions ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          minWidth="680px"
          className="border-0"
        />
      )}

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
