"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteHiringFlowRound } from "@/hooks/api/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import type { HiringFlowRound } from "@/types/hr/recruitment";
import { RoundTypeBadge, ModeBadge } from "./round-type-badge";

interface RoundItemProps {
  round: HiringFlowRound;
  flowId: number;
  onEdit: (round: HiringFlowRound) => void;
}

export function RoundItem({ round, flowId, onEdit }: RoundItemProps) {
  const deleteRound = useDeleteHiringFlowRound();

  const handleDelete = useCallback(() => {
    deleteRound.mutate(
      { flowId, roundId: round.id },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [deleteRound, flowId, round.id]);

  function handleEditClick() {
    onEdit(round);
  }

  return (
    <div className="group flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2">
      <svg
        className="h-4 w-4 shrink-0 text-muted-foreground/40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="9" cy="5" r="1" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="5" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="15" cy="19" r="1" />
      </svg>
      <TruncatedText text={round.name} className="flex-1 text-sm font-medium" />
      <div className="flex items-center gap-1.5 shrink-0">
        <RoundTypeBadge type={round.roundType} />
        <ModeBadge mode={round.mode} />
        <span className="text-[10px] text-muted-foreground">{round.durationMinutes}m</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton
              icon={EllipsisIcon}
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              aria-label="Round actions"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEditClick}>Edit round</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={deleteRound.isPending}
              className="text-destructive focus:text-destructive"
            >
              Delete round
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
