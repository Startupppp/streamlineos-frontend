"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, X } from "lucide-react";
import { HR_FIELD_TYPE_META } from "../lib/field-type-meta";
import type { HrFormField, HrFormFieldType } from "../lib/types";

interface FieldConfigPanelProps {
  field: HrFormField;
  allFields: HrFormField[];
  onChange: (updated: HrFormField) => void;
  onRemove: () => void;
}

export function FieldConfigPanel({ field, allFields, onChange, onRemove }: FieldConfigPanelProps) {
  const [newOption, setNewOption] = useState("");
  const meta = HR_FIELD_TYPE_META[field.type];
  const otherFields = allFields.filter((f) => f.key !== field.key);

  function update(patch: Partial<HrFormField>) {
    onChange({ ...field, ...patch });
  }

  function handleLabelChange(e: React.ChangeEvent<HTMLInputElement>) {
    update({ label: e.target.value });
  }

  function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    update({ key: e.target.value });
  }

  function handleTypeChange(type: string) {
    update({ type: type as HrFormFieldType, options: undefined });
  }

  function handleAddOption() {
    if (!newOption.trim()) return;
    const opt = { label: newOption.trim(), value: newOption.trim().toLowerCase().replace(/\s+/g, "_") };
    update({ options: [...(field.options ?? []), opt] });
    setNewOption("");
  }

  function handleRemoveOption(idx: number) {
    update({ options: (field.options ?? []).filter((_, i) => i !== idx) });
  }

  function handleNewOptionKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAddOption(); }
  }

  function handleNewOptionChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewOption(e.target.value);
  }

  return (
    <div className="space-y-3 p-3 border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{meta.label} field</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Label *</Label>
          <Input value={field.label} onChange={handleLabelChange} className="h-8 text-xs" placeholder="Field label" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Key *</Label>
          <Input value={field.key} onChange={handleKeyChange} className="h-8 text-xs font-mono" placeholder="field_key" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Type</Label>
        <Select value={field.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(HR_FIELD_TYPE_META).map(([t, m]) => (
              <SelectItem key={t} value={t} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {meta.needsOptions && (
        <div className="space-y-1.5">
          <Label className="text-xs">Options</Label>
          <div className="space-y-1">
            {(field.options ?? []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className="flex-1 text-xs px-2 py-1 bg-muted rounded">{opt.label}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveOption(idx)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-1">
              <Input
                value={newOption}
                onChange={handleNewOptionChange}
                onKeyDown={handleNewOptionKeyDown}
                className="h-8 text-xs flex-1"
                placeholder="Add option…"
              />
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleAddOption}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Switch checked={field.required} onCheckedChange={(v) => update({ required: v })} className="h-4 w-7" />
          <Label className="text-xs">Required</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch checked={field.sensitive} onCheckedChange={(v) => update({ sensitive: v })} className="h-4 w-7" />
          <Label className="text-xs">Sensitive</Label>
        </div>
      </div>

      {otherFields.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Conditional (show if…)</Label>
            <Select
              value={field.conditional?.fieldKey ?? "none"}
              onValueChange={(v) => update({ conditional: v === "none" ? null : { fieldKey: v, operator: "notEmpty" } })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Always show" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">Always show</SelectItem>
                {otherFields.map((f) => (
                  <SelectItem key={f.key} value={f.key} className="text-xs">{f.label || f.key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.conditional?.fieldKey && (
              <Select
                value={field.conditional.operator}
                onValueChange={(v) => update({
                  conditional: { ...field.conditional!, operator: v as "eq" | "neq" | "contains" | "notEmpty" }
                })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notEmpty" className="text-xs">is not empty</SelectItem>
                  <SelectItem value="eq" className="text-xs">equals</SelectItem>
                  <SelectItem value="neq" className="text-xs">does not equal</SelectItem>
                  <SelectItem value="contains" className="text-xs">contains</SelectItem>
                </SelectContent>
              </Select>
            )}
            {field.conditional?.fieldKey && field.conditional.operator !== "notEmpty" && (
              <Input
                className="h-8 text-xs"
                placeholder="Value…"
                value={typeof field.conditional.value === "string" ? field.conditional.value : ""}
                onChange={(e) => update({ conditional: { ...field.conditional!, value: e.target.value } })}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
