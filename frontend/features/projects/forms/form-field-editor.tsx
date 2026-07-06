"use client";

import { ChevronUp, ChevronDown, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  function handleAdd() {
    onChange([...fields, { key: "", label: "", type: "text", required: false }]);
  }

  function handleRemove(idx: number) {
    onChange(fields.filter((_, i) => i !== idx));
  }

  function handleMoveUp(idx: number) {
    if (idx === 0) return;
    const next = [...fields];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }

  function handleMoveDown(idx: number) {
    if (idx === fields.length - 1) return;
    const next = [...fields];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }

  function handleLabelChange(idx: number, label: string) {
    onChange(
      fields.map((f, i) =>
        i === idx ? { ...f, label, key: f.key || slugify(label) } : f,
      ),
    );
  }

  function handleTypeChange(idx: number, type: FormFieldType) {
    onChange(
      fields.map((f, i) =>
        i === idx
          ? { ...f, type, options: FIELD_TYPE_META[type].needsOptions ? (f.options ?? []) : undefined }
          : f,
      ),
    );
  }

  function handleRequiredChange(idx: number, required: boolean) {
    onChange(fields.map((f, i) => (i === idx ? { ...f, required } : f)));
  }

  function handleOptionsChange(idx: number, raw: string) {
    const options = raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    onChange(fields.map((f, i) => (i === idx ? { ...f, options } : f)));
  }

  return (
    <div className="space-y-2">
      {fields.map((field, idx) => (
        <FieldRow
          key={idx}
          field={field}
          index={idx}
          total={fields.length}
          onLabelChange={(v) => handleLabelChange(idx, v)}
          onTypeChange={(v) => handleTypeChange(idx, v)}
          onRequiredChange={(v) => handleRequiredChange(idx, v)}
          onOptionsChange={(v) => handleOptionsChange(idx, v)}
          onMoveUp={() => handleMoveUp(idx)}
          onMoveDown={() => handleMoveDown(idx)}
          onRemove={() => handleRemove(idx)}
        />
      ))}
      <Button type="button" variant="outline" size="sm" className="h-7 text-xs w-full" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add Field
      </Button>
    </div>
  );
}

interface FieldRowProps {
  field: FormField;
  index: number;
  total: number;
  onLabelChange: (v: string) => void;
  onTypeChange: (v: FormFieldType) => void;
  onRequiredChange: (v: boolean) => void;
  onOptionsChange: (v: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function FieldRow({
  field, index, total,
  onLabelChange, onTypeChange, onRequiredChange, onOptionsChange,
  onMoveUp, onMoveDown, onRemove,
}: FieldRowProps) {
  const meta = FIELD_TYPE_META[field.type];

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5 shrink-0">
          <Button
            type="button" variant="ghost" size="icon" className="h-5 w-5"
            onClick={onMoveUp} disabled={index === 0} aria-label="Move field up"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            type="button" variant="ghost" size="icon" className="h-5 w-5"
            onClick={onMoveDown} disabled={index === total - 1} aria-label="Move field down"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <Input
          value={field.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Field label"
          className="h-8 text-sm flex-1 min-w-0"
        />
        <Select value={field.type} onValueChange={(v) => onTypeChange(v as FormFieldType)}>
          <SelectTrigger className="h-8 w-36 text-xs shrink-0">
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
          <Switch checked={field.required} onCheckedChange={onRequiredChange} />
        </div>
        <Button
          type="button" variant="ghost" size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove} aria-label="Remove field"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {meta.needsOptions && (
        <Textarea
          value={(field.options ?? []).join("\n")}
          onChange={(e) => onOptionsChange(e.target.value)}
          placeholder="Options — one per line or comma-separated"
          className="text-xs h-16 resize-none"
        />
      )}
    </div>
  );
}
