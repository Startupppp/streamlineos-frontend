"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";

/**
 * Edit and delete, for a row of a generated settings list.
 *
 * Row actions are not part of a layout description and should not be: what a
 * caller may do to a row depends on their permissions, which is a screen concern
 * rather than a shape one. What every CRM settings list *does* share is these
 * two controls, so they live here once instead of being redrawn in eleven files
 * with eleven slightly different icon sizes.
 *
 * The delete icon animates through `AnimatedIconButton` rather than through a
 * local `useAnimatedIcon`. Both reach the same place, but wiring the hook by
 * hand reads the ref during render — which `react-hooks/refs` reports, and
 * rightly. The button exists so that one component owns the wiring.
 */

interface RecordRowActionsProps {
  /** A control that belongs to this row but is not edit or delete — a state
   *  toggle, say. Rendered first so the two familiar icons stay rightmost. */
  leading?: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
}

export function RecordRowActions({
  leading,
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
}: RecordRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-gap-inline">
      {leading}
      {onEdit ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onEdit}
          aria-label={editLabel}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {onDelete ? (
        <AnimatedIconButton
          icon={Trash2Icon}
          iconSize={14}
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={onDelete}
          aria-label={deleteLabel}
        />
      ) : null}
    </div>
  );
}
