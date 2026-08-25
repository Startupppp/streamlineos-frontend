"use client";

import { useCallback } from "react";
import { Phone, Mail, StickyNote, ListTodo, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import type { QuickAction } from "./lead-types";

export const ACTION_BUTTONS = [
  { key: "call"  as const, label: "Log Call",    icon: Phone,      color: "bg-primary/10 text-primary hover:bg-primary/20"        },
  { key: "email" as const, label: "Send Email",  icon: Mail,       color: "bg-primary/10 text-primary hover:bg-primary/20"        },
  { key: "note"  as const, label: "Add Note",    icon: StickyNote, color: "bg-status-warning-surface text-status-warning-ink hover:bg-amber-500/20"     },
  { key: "task"  as const, label: "New Task",    icon: ListTodo,   color: "bg-status-success-surface text-status-success-ink hover:bg-emerald-500/20"},
  { key: "draft" as const, label: "Draft Email", icon: Wand2,      color: "bg-primary/10 text-primary hover:bg-primary/20"        },
] as const;

type ActionButtonData = (typeof ACTION_BUTTONS)[number];

interface ActionToggleButtonProps {
  action: ActionButtonData;
  isActive: boolean;
  onSetActiveAction: (action: QuickAction) => void;
}

export function ActionToggleButton({ action, isActive, onSetActiveAction }: ActionToggleButtonProps) {
  const handleClick = useCallback(
    () => onSetActiveAction(isActive ? null : action.key),
    [isActive, action.key, onSetActiveAction],
  );
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(action.color, isActive && "ring-2 ring-current/30")}
      onClick={handleClick}
    >
      <action.icon className="h-4 w-4 mr-1.5" />
      {action.label}
    </Button>
  );
}

interface DraftPanelProps {
  leadName?: string;
  isPending: boolean;
  onGenerate: () => void;
  onCancel: () => void;
}

export function DraftPanel({ leadName, isPending, onGenerate, onCancel }: DraftPanelProps) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/30">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">AI Email Draft</p>
          <p className="text-xs text-muted-foreground">
            Generate a professional email for{" "}
            <span className="font-medium text-foreground">{leadName ?? "this lead"}</span>
            {" "}using AI. The draft will pre-fill the email form for your review.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <LoadingButton
          type="button"
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={onGenerate}
          isPending={isPending || !leadName}
          loadingText="Generating..."
        >
          <Wand2 className="h-4 w-4 mr-1.5" />
          Generate
        </LoadingButton>
      </div>
    </div>
  );
}
