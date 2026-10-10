"use client";

import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface GoalDetailActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function GoalDetailActions({ onEdit, onDelete }: GoalDetailActionsProps) {
  const { iconRef: trashRef, hoverHandlers: trashHandlers } = useAnimatedIcon();
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" aria-label="Edit" onClick={onEdit}>
        <Pencil className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Edit</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        aria-label="Delete"
        onClick={onDelete}
        {...trashHandlers}
      >
        <Trash2Icon ref={trashRef} size={16} className="text-destructive sm:mr-1" />
        <span className="hidden sm:inline">Delete</span>
      </Button>
    </div>
  );
}

interface AddLinkButtonProps {
  onClick: () => void;
}

export function AddLinkButton({ onClick }: AddLinkButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" variant="outline" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" /> Link
    </Button>
  );
}
