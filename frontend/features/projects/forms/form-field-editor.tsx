"use client";

import { memo, useCallback } from "react";
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
      <Button type="button" variant="outline" size="sm" className="text-xs w-full" onClick={handleAdd}>
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

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5 shrink-0">
          <Button
            type="button" variant="ghost" size="icon" className="h-5 w-5"
            onClick={() => onMoveUp(index)} disabled={index === 0} aria-label="Move field up"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            type="button" variant="ghost" size="icon" className="h-5 w-5"
            onClick={() => onMoveDown(index)} disabled={index === total - 1} aria-label="Move field down"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <Input
          value={field.label}
          onChange={(e) => onLabelChange(index, e.target.value)}
          placeholder="Field label"
          className="text-sm flex-1 min-w-0"
        />
        <Select value={field.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-36 text-xs shrink-0">
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
          <Switch checked={field.required} onCheckedChange={(v) => onRequiredChange(index, v)} />
        </div>
        <Button
          type="button" variant="ghost" size="icon"
          className="w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(index)} aria-label="Remove field"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {meta.needsOptions && (
        <Textarea
          value={(field.options ?? []).join("\n")}
          onChange={(e) => onOptionsChange(index, e.target.value)}
          placeholder="Options — one per line or comma-separated"
          className="text-xs h-16 resize-none"
        />
      )}
    </div>
  );
});
