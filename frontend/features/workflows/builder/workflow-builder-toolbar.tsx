import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { ArrowLeft, Save, Settings, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { WorkflowStatus } from "@/hooks/api/workflows";

const STATUS_BADGE: Record<WorkflowStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  published: { label: "Published", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  disabled: { label: "Disabled", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  archived: { label: "Archived", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
};

interface WorkflowBuilderToolbarProps {
  isEditingName: boolean;
  isPublishing: boolean;
  isSaving: boolean;
  name: string;
  status: WorkflowStatus;
  onBack: () => void;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onNameSubmit: (event: FormEvent) => void;
  onStartNameEditing: () => void;
  onPublish: () => void;
  onSave: () => void;
}

export function WorkflowBuilderToolbar({ isEditingName, isPublishing, isSaving, name, status, onBack, onNameChange, onNameKeyDown, onNameSubmit, onStartNameEditing, onPublish, onSave }: WorkflowBuilderToolbarProps) {
  const badge = STATUS_BADGE[status];

  return (
    <header className="h-12 shrink-0 bg-card border-b border-border flex items-center px-3 gap-3 shadow-sm">
      <button type="button" onClick={onBack} className="w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground" aria-label="Back to workflow"><ArrowLeft className="h-4 w-4" /></button>
      <div className="h-4 w-px bg-border" />
      {isEditingName ? (
        <form onSubmit={onNameSubmit} className="flex-1 max-w-xs"><Input autoFocus value={name} onChange={onNameChange} onBlur={onNameSubmit} onKeyDown={onNameKeyDown} className="text-sm font-medium" aria-label="Workflow name" /></form>
      ) : (
        <button type="button" onClick={onStartNameEditing} className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors group" title="Click to rename">
          {name}<Settings className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-micro font-medium border", badge.className)}>{badge.label}</span>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={onSave} disabled={isSaving}><Save className="h-3.5 w-3.5 mr-1" />{isSaving ? "Saving…" : "Save"}</Button>
        <Button size="sm" className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200" onClick={onPublish} disabled={isPublishing}><Upload className="h-3.5 w-3.5 mr-1" />{isPublishing ? "Publishing…" : "Publish"}</Button>
      </div>
    </header>
  );
}
