"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";


interface RecordRowActionsProps {
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
