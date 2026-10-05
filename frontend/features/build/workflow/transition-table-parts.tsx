"use client";

import { useCallback } from "react";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import type { WorkflowTransition } from "@/types/projects/workflow";

export const TRANSITION_TABLE_HEADERS = [
  "From",
  "To",
  "Label",
  "Approval",
  "Required fields",
  "Allowed roles",
  "Actions",
] as const;

export function AddTransitionButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      Add
    </Button>
  );
}

export function TransitionRowActions({
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

export function buildTransitionColumns({
  resolveStatusName,
  canManage,
  onEdit,
  onDelete,
}: {
  resolveStatusName: (id: number | null) => string;
  canManage: boolean;
  onEdit: (t: WorkflowTransition) => void;
  onDelete: (t: WorkflowTransition) => void;
}): DataTableColumn<WorkflowTransition>[] {
  const cols: DataTableColumn<WorkflowTransition>[] = [
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
  ];
  if (canManage) {
    cols.push({
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-10",
      cell: (row) => (
        <TransitionRowActions
          transition={row}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    });
  }
  return cols;
}
