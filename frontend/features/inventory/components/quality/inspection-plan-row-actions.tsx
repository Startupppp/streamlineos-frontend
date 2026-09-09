"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeleteInspectionPlan } from "@/hooks/api/inventory/inspection-plans";
import type { InspectionPlan } from "@/hooks/api/inventory/inspection-plans";
import { InspectionPlanEditDialog } from "./inspection-plan-edit-dialog";

interface InspectionPlanRowActionsProps {
  plan: InspectionPlan;
}

/**
 * Edit and retire, on the row rather than behind the detail sheet.
 *
 * `PATCH` and `DELETE` on a plan both existed, were permissioned and had hooks;
 * neither had a caller, so a plan created with the wrong name or the wrong
 * trigger could only be worked around. The sheet the row opens owns versions,
 * which are append-only — the plan's own fields are edited here.
 */
export function InspectionPlanRowActions({ plan }: InspectionPlanRowActionsProps) {
  const deletePlan = useDeleteInspectionPlan();
  const [editOpen, setEditOpen] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);

  /**
   * The row is itself a button that opens the plan. Without these the menu
   * would open the detail sheet underneath itself, by mouse and by keyboard
   * alike — the row's own Enter/Space handler is what the second one stops.
   */
  function handleCellClick(event: MouseEvent<HTMLDivElement>): void {
    event.stopPropagation();
  }

  function handleCellKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Enter" || event.key === " ") event.stopPropagation();
  }

  function handleOpenEdit(): void {
    setEditOpen(true);
  }

  function handleOpenRetire(): void {
    setRetireOpen(true);
  }

  function handleRetire(): void {
    deletePlan.mutate(plan.id, {
      onSuccess: () => {
        toast.success("Inspection plan retired");
        setRetireOpen(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <div onClick={handleCellClick} onKeyDown={handleCellKeyDown}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton
            icon={EllipsisIcon}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={`Actions for ${plan.name}`}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleOpenEdit}>Edit plan</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleOpenRetire}>
            Retire plan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InspectionPlanEditDialog open={editOpen} onOpenChange={setEditOpen} plan={plan} />

      <ConfirmDialog
        open={retireOpen}
        onOpenChange={setRetireOpen}
        title={`Retire ${plan.name}?`}
        description="Arrivals stop being held against this plan. Inspections it already governed keep their verdict and the version they were judged against, and its code becomes free to reuse."
        confirmLabel="Retire plan"
        destructive
        keepOpenOnConfirm
        isPending={deletePlan.isPending}
        onConfirm={handleRetire}
      />
    </div>
  );
}
