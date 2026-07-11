"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/ui/loading-button";
import { FieldPalette } from "./field-palette";
import { FieldConfigPanel } from "./field-config-panel";
import { slugify } from "../lib/field-type-meta";
import type { HrFormField, HrFormFieldType, HrForm, CreateHrFormPayload } from "../lib/types";

const WORKFLOW_TYPES = [
  { value: "leave_request", label: "Leave Request" },
  { value: "expense_reimbursement", label: "Expense Reimbursement" },
  { value: "travel_request", label: "Travel Request" },
  { value: "asset_request", label: "Asset Request" },
  { value: "employee_data_change", label: "Employee Data Change" },
  { value: "grievance_case", label: "Grievance Case" },
  { value: "document_review", label: "Document Review" },
];

interface FormBuilderProps {
  form?: HrForm;
  onSave: (data: CreateHrFormPayload) => void;
  isPending: boolean;
}

function generateKey(label: string, existing: string[]): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field";
  let key = base;
  let n = 2;
  while (existing.includes(key)) { key = `${base}_${n}`; n++; }
  return key;
}

export function FormBuilder({ form, onSave, isPending }: FormBuilderProps) {
  const [name, setName] = useState(form?.name ?? "");
  const [slug, setSlug] = useState(form?.slug ?? "");
  const [description, setDescription] = useState(form?.description ?? "");
  const [audience, setAudience] = useState<"internal" | "public">(form?.audience ?? "internal");
  const [workflowType, setWorkflowType] = useState(form?.workflowObjectType ?? "none");
  const [fields, setFields] = useState<HrFormField[]>(form?.schema ?? []);
  const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(null);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setName(v);
    if (!form) setSlug(slugify(v));
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value);
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescription(e.target.value);
  }

  function handleAddField(type: HrFormFieldType) {
    const existing = fields.map((f) => f.key);
    const key = generateKey(type, existing);
    const newField: HrFormField = { key, label: key.replace(/_/g, " "), type, required: false, sensitive: false };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldIdx(fields.length);
  }

  function handleUpdateField(idx: number, updated: HrFormField) {
    setFields((prev) => prev.map((f, i) => (i === idx ? updated : f)));
  }

  function handleRemoveField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setSelectedFieldIdx(null);
  }

  function handleMoveField(idx: number, dir: -1 | 1) {
    const next = [...fields];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    setFields(next);
    setSelectedFieldIdx(swap);
  }

  function handleSave() {
    if (!name.trim() || !slug.trim()) return;
    onSave({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      audience,
      workflowObjectType: workflowType === "none" ? null : workflowType,
      schema: fields,
    });
  }

  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="w-44 shrink-0 overflow-y-auto border-r border-border pr-3">
        <FieldPalette onAddField={handleAddField} />
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto space-y-4 pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Form Name *</Label>
            <Input value={name} onChange={handleNameChange} placeholder="e.g. WFH Request" className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Slug *</Label>
            <Input value={slug} onChange={handleSlugChange} placeholder="wfh-request" className="h-8 text-sm font-mono" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Textarea value={description} onChange={handleDescriptionChange} className="text-sm h-14 resize-none" placeholder="Optional" />
        </div>

        <div className="flex items-center gap-6">
          <div className="space-y-1">
            <Label className="text-xs">Audience</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as "internal" | "public")}>
              <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Trigger workflow</Label>
            <Select value={workflowType} onValueChange={setWorkflowType}>
              <SelectTrigger className="h-8 text-sm w-52"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {WORKFLOW_TYPES.map((w) => (
                  <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fields ({fields.length})
          </Label>

          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
              Add fields from the palette on the left
            </p>
          )}

          {fields.map((field, idx) => (
            <div
              key={`${field.key}-${idx}`}
              className={`cursor-pointer rounded-lg border ${selectedFieldIdx === idx ? "border-blue-500 ring-1 ring-blue-500" : "border-border"}`}
              onClick={() => setSelectedFieldIdx(selectedFieldIdx === idx ? null : idx)}
            >
              {selectedFieldIdx === idx ? (
                <FieldConfigPanel
                  field={field}
                  allFields={fields}
                  onChange={(updated) => handleUpdateField(idx, updated)}
                  onRemove={() => handleRemoveField(idx)}
                />
              ) : (
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{field.label || field.key}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{field.type}</span>
                    {field.required && <span className="ml-1 text-xs text-destructive">*</span>}
                    {field.sensitive && <span className="ml-1 text-xs text-amber-600">sensitive</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleMoveField(idx, -1); }}>↑</Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleMoveField(idx, 1); }}>↓</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <LoadingButton size="sm" isPending={isPending} onClick={handleSave} disabled={!name.trim() || !slug.trim()}>
            Save Form
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
