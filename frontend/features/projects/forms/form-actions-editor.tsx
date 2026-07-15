"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { FormAction, FormField } from "@/types/projects/forms";

const ACTION_TYPE_OPTIONS = [
  { value: "create_task", label: "Create Task" },
  { value: "create_bug", label: "Create Bug" },
  { value: "notify", label: "Send Notification" },
  { value: "request_approval", label: "Request Approval" },
];

const TICKET_ACTION_TYPES = new Set(["create_task", "create_bug"]);

interface FormActionsEditorProps {
  actions: FormAction[];
  fields: FormField[];
  onChange: (actions: FormAction[]) => void;
}

export function FormActionsEditor({ actions, fields, onChange }: FormActionsEditorProps) {
  function handleAdd() {
    onChange([...actions, { type: "create_task", config: {} }]);
  }

  function handleRemove(idx: number) {
    onChange(actions.filter((_, i) => i !== idx));
  }

  function handleTypeChange(idx: number, type: string) {
    onChange(actions.map((a, i) => (i === idx ? { type, config: {} } : a)));
  }

  function handleTitleFieldChange(idx: number, fieldKey: string) {
    onChange(
      actions.map((a, i) =>
        i === idx ? { ...a, config: { ...(a.config ?? {}), titleField: fieldKey } } : a,
      ),
    );
  }

  function getTitleField(action: FormAction): string {
    const v = (action.config ?? {})["titleField"];
    return typeof v === "string" ? v : "";
  }

  return (
    <div className="space-y-2">
      {actions.map((action, idx) => (
        <div key={idx} className="rounded-lg border bg-card p-3 flex flex-wrap items-center gap-2">
          <Select value={action.type} onValueChange={(v) => handleTypeChange(idx, v)}>
            <SelectTrigger className="w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {TICKET_ACTION_TYPES.has(action.type) && fields.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Title from</Label>
              <Select
                value={getTitleField(action)}
                onValueChange={(v) => handleTitleFieldChange(idx, v)}
              >
                <SelectTrigger className="w-40 text-xs">
                  <SelectValue placeholder="Select field…" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>{f.label || f.key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            type="button" variant="ghost" size="icon"
            className="w-8 ml-auto text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(idx)} aria-label="Remove action"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="text-xs w-full" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add Action
      </Button>
    </div>
  );
}
