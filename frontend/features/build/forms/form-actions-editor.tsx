"use client";

import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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

interface ActionRowProps {
  action: FormAction;
  idx: number;
  fields: FormField[];
  onTypeChange: (idx: number, type: string) => void;
  onTitleFieldChange: (idx: number, fieldKey: string) => void;
  onRemove: (idx: number) => void;
}

function getTitleField(action: FormAction): string {
  const v = (action.config ?? {})["titleField"];
  return typeof v === "string" ? v : "";
}

function ActionRow({ action, idx, fields, onTypeChange, onTitleFieldChange, onRemove }: ActionRowProps) {
  function handleTypeChange(v: string) { onTypeChange(idx, v); }
  function handleTitleFieldChange(v: string) { onTitleFieldChange(idx, v); }
  function handleRemove() { onRemove(idx); }

  return (
    <div className="rounded-lg border bg-card p-3 flex flex-wrap items-center gap-2">
      <Select value={action.type} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-44">
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
          <Select value={getTitleField(action)} onValueChange={handleTitleFieldChange}>
            <SelectTrigger className="w-40">
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
      <AnimatedIconButton
        type="button" variant="ghost" size="icon" icon={XIcon} iconSize={14}
        className="w-8 ml-auto text-muted-foreground hover:text-destructive"
        onClick={handleRemove} aria-label="Remove action"
      />
    </div>
  );
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

  return (
    <div className="space-y-2">
      {actions.map((action, idx) => (
        <ActionRow
          key={idx}
          action={action}
          idx={idx}
          fields={fields}
          onTypeChange={handleTypeChange}
          onTitleFieldChange={handleTitleFieldChange}
          onRemove={handleRemove}
        />
      ))}
      <AnimatedIconButton type="button" variant="outline" size="sm" icon={PlusIcon} iconSize={14} iconClassName="mr-1" className="text-xs w-full" onClick={handleAdd}>
        Add Action
      </AnimatedIconButton>
    </div>
  );
}
