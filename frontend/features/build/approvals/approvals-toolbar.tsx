"use client";

import { ChevronDownIcon, EllipsisIcon, PlusIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { DECIDABLE } from "./approvals-constants";
import type { ApprovalStatus } from "@/types/projects";

interface RequestApprovalMenuButtonProps {
  onRequestTask: () => void;
  onRequestRelease: () => void;
  onRequestMilestone: () => void;
}

export function RequestApprovalMenuButton({
  onRequestTask,
  onRequestRelease,
  onRequestMilestone,
}: RequestApprovalMenuButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button {...hoverHandlers}>
          <PlusIcon ref={iconRef} size={14} />
          Request approval
          <ChevronDownIcon size={12} className="ml-0.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onRequestTask}>Request task approval</DropdownMenuItem>
        <DropdownMenuItem onClick={onRequestRelease}>Request release approval</DropdownMenuItem>
        <DropdownMenuItem onClick={onRequestMilestone}>Request milestone approval</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ApprovalActionsProps {
  canDecideRow: boolean;
  canManage: boolean;
  status: ApprovalStatus;
  onDecide: () => void;
  onDelegate: () => void;
  onEscalate: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function ApprovalActions({
  canDecideRow,
  canManage,
  status,
  onDecide,
  onDelegate,
  onEscalate,
  onCancel,
  onDelete,
}: ApprovalActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  if (!canDecideRow && !canManage) return null;
  const decidable = DECIDABLE.has(status);
  const isEscalated = status === "escalated";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Approval actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canDecideRow ? <DropdownMenuItem onClick={onDecide}>Decide</DropdownMenuItem> : null}
        {canManage && decidable ? <DropdownMenuItem onClick={onDelegate}>Delegate</DropdownMenuItem> : null}
        {canManage && decidable && !isEscalated ? (
          <DropdownMenuItem onClick={onEscalate}>Escalate</DropdownMenuItem>
        ) : null}
        {canManage && decidable ? <DropdownMenuItem onClick={onCancel}>Cancel</DropdownMenuItem> : null}
        {canManage ? (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
