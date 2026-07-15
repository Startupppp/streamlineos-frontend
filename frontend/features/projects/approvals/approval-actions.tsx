"use client";

import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ApprovalActionsProps {
  canDecideRow: boolean;
  canManage: boolean;
  decidable: boolean;
  isEscalated: boolean;
  onDecide: () => void;
  onDelegate: () => void;
  onEscalate: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function ApprovalActions({
  canDecideRow,
  canManage,
  decidable,
  isEscalated,
  onDecide,
  onDelegate,
  onEscalate,
  onCancel,
  onDelete,
}: ApprovalActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  if (!canDecideRow && !canManage) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Approval actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canDecideRow ? <DropdownMenuItem onClick={onDecide}>Decide</DropdownMenuItem> : null}
        {canManage && decidable ? (
          <DropdownMenuItem onClick={onDelegate}>Delegate</DropdownMenuItem>
        ) : null}
        {canManage && decidable && !isEscalated ? (
          <DropdownMenuItem onClick={onEscalate}>Escalate</DropdownMenuItem>
        ) : null}
        {canManage && decidable ? (
          <DropdownMenuItem onClick={onCancel}>Cancel</DropdownMenuItem>
        ) : null}
        {canManage ? (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
