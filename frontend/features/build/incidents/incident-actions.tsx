"use client";

import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface IncidentActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function IncidentActions({ onEdit, onDelete }: IncidentActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="text-dense" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5 mr-1" />
        Edit
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-dense text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={onDelete}
        {...hoverHandlers}
      >
        <Trash2Icon ref={iconRef} size={14} className="mr-1" />
        Delete
      </Button>
    </div>
  );
}

export function InfoSection({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-xs text-foreground">
        {value ?? <span className="italic text-muted-foreground">Not set</span>}
      </p>
    </div>
  );
}
