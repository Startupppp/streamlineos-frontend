"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCan } from "@/hooks/api/access";
import { CreateTicketDialog } from "@/features/projects/tickets/create-ticket-dialog";
import type { KanbanTicket } from "../shared/types";

export function resolveSwimlaneCycleId(
  rowKey: string,
  tickets: KanbanTicket[],
): number | null {
  if (rowKey === "No cycle") return null;
  for (const ticket of tickets) {
    if (ticket.cycle?.id != null) return ticket.cycle.id;
    if (ticket.cycleId != null) return ticket.cycleId;
  }
  return null;
}

interface SwimlaneCycleCreateButtonProps {
  projectId: number;
  cycleId: number | null;
  cycleLabel: string;
}

export function SwimlaneCycleCreateButton({
  projectId,
  cycleId,
  cycleLabel,
}: SwimlaneCycleCreateButtonProps) {
  const canCreate = useCan("projects:tickets:create");
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const [open, setOpen] = useState(false);

  const handleOpenCreate = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
  }, []);

  if (!canCreate) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpenCreate}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        aria-label={`Create issue in ${cycleLabel}`}
        {...hoverHandlers}
      >
        <PlusIcon ref={iconRef} size={14} />
      </button>
      <CreateTicketDialog
        projectId={projectId}
        defaultCycleId={cycleId}
        hideTrigger
        externalOpen={open}
        onExternalOpenChange={handleOpenChange}
      />
    </>
  );
}
