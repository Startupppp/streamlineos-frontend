"use client";

import { memo, useCallback, type ChangeEvent } from "react";
import { ChevronUpIcon, ChevronDownIcon, XIcon, PlusIcon } from "@animateicons/react/lucide";
import { Input } from "@/components/ui/input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { FormField, FormFieldType } from "@/types/projects/forms";
import { FIELD_TYPE_META, FIELD_TYPES } from "./field-type-meta";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

interface FormFieldEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

export function FormFieldEditor({ fields, onChange }: FormFieldEditorProps) {
  const handleAdd = useCallback(() => {
    onChange([...fields, { key: "", label: "", type: "text", required: false }]);
  }, [fields, onChange]);

  const handleRemove = useCallback((idx: number) => {
    onChange(fields.filter((_, i) => i !== idx));
  }, [fields, onChange]);

  const handleMoveUp = useCallback((idx: number) => {
    if (idx === 0) return;
    const next = [...fields];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }, [fields, onChange]);

  const handleMoveDown = useCallback((idx: number) => {
    if (idx === fields.length - 1) return;
    const next = [...fields];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }, [fields, onChange]);

  const handleLabelChange = useCallback((idx: number, label: string) => {
    onChange(
      fields.map((f, i) =>
        i === idx ? { ...f, label, key: f.key || slugify(label) } : f,
      ),
    );
  }, [fields, onChange]);

  const handleTypeChange = useCallback((idx: number, type: FormFieldType) => {
    onChange(
      fields.map((f, i) =>
        i === idx
          ? { ...f, type, options: FIELD_TYPE_META[type].needsOptions ? (f.options ?? []) : undefined }
          : f,
      ),
    );
  }, [fields, onChange]);

  const handleRequiredChange = useCallback((idx: number, required: boolean) => {
    onChange(fields.map((f, i) => (i === idx ? { ...f, required } : f)));
  }, [fields, onChange]);

  const handleOptionsChange = useCallback((idx: number, raw: string) => {
    const options = raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    onChange(fields.map((f, i) => (i === idx ? { ...f, options } : f)));
  }, [fields, onChange]);

  return (
    <div className="space-y-2">
      {fields.map((field, idx) => (
        <FieldRow
          key={idx}
          field={field}
          index={idx}
          total={fields.length}
          onLabelChange={handleLabelChange}
          onTypeChange={handleTypeChange}
          onRequiredChange={handleRequiredChange}
          onOptionsChange={handleOptionsChange}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onRemove={handleRemove}
        />
      ))}
      <AnimatedIconButton type="button" variant="outline" size="sm" icon={PlusIcon} iconSize={14} iconClassName="mr-1" className="text-xs w-full" onClick={handleAdd}>
        Add Field
      </AnimatedIconButton>
    </div>
  );
}

interface FieldRowProps {
  field: FormField;
  index: number;
  total: number;
  onLabelChange: (idx: number, v: string) => void;
  onTypeChange: (idx: number, v: FormFieldType) => void;
  onRequiredChange: (idx: number, v: boolean) => void;
  onOptionsChange: (idx: number, v: string) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onRemove: (idx: number) => void;
}

const FieldRow = memo(function FieldRow({
  field, index, total,
  onLabelChange, onTypeChange, onRequiredChange, onOptionsChange,
  onMoveUp, onMoveDown, onRemove,
}: FieldRowProps) {
  const meta = FIELD_TYPE_META[field.type];

  function handleTypeChange(v: string) {
    const found = FIELD_TYPES.find((t) => t === v);
    if (found) onTypeChange(index, found);
  }

  function handleMoveUp() { onMoveUp(index); }
  function handleMoveDown() { onMoveDown(index); }
  function handleLabelChange(e: ChangeEvent<HTMLInputElement>) { onLabelChange(index, e.target.value); }
  function handleRequiredChange(v: boolean) { onRequiredChange(index, v); }
  function handleRemove() { onRemove(index); }
  function handleOptionsChange(e: ChangeEvent<HTMLTextAreaElement>) { onOptionsChange(index, e.target.value); }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5 shrink-0">
          <AnimatedIconButton
            type="button" variant="ghost" size="icon" icon={ChevronUpIcon} iconSize={12} className="h-5 w-5"
            onClick={handleMoveUp} disabled={index === 0} aria-label="Move field up"
          />
          <AnimatedIconButton
            type="button" variant="ghost" size="icon" icon={ChevronDownIcon} iconSize={12} className="h-5 w-5"
            onClick={handleMoveDown} disabled={index === total - 1} aria-label="Move field down"
          />
        </div>
        <Input
          value={field.label}
          onChange={handleLabelChange}
          placeholder="Field label"
          className="text-sm flex-1 min-w-0"
        />
        <Select value={field.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-36 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{FIELD_TYPE_META[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 shrink-0">
          <Label className="text-xs text-muted-foreground">Req</Label>
          <Switch checked={field.required} onCheckedChange={handleRequiredChange} />
        </div>
        <AnimatedIconButton
          type="button" variant="ghost" size="icon" icon={XIcon} iconSize={14}
          className="w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleRemove} aria-label="Remove field"
        />
      </div>
      {meta.needsOptions && (
        <Textarea
          value={(field.options ?? []).join("\n")}
          onChange={handleOptionsChange}
          placeholder="Options — one per line or comma-separated"
          className="text-xs h-16 resize-none"
        />
      )}
    </div>
  );
});
