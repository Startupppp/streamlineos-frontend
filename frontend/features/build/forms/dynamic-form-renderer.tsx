"use client";

import { useState } from "react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectMembers } from "@/hooks/api/build";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import type { FormField } from "@/types/projects/forms";

interface DynamicFormRendererProps {
  fields: FormField[];
  projectId: number;
  onSubmit: (values: Record<string, unknown>, submittedByName?: string) => void;
  isPending: boolean;
}

function MultiSelectField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function handleToggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {(field.options ?? []).map((opt) => (
        <div key={opt} className="flex items-center gap-1.5">
          <Checkbox
            checked={value.includes(opt)}
            onCheckedChange={() => handleToggle(opt)}
            id={`${field.key}-${opt}`}
          />
          <Label htmlFor={`${field.key}-${opt}`} className="text-sm font-normal cursor-pointer">
            {opt}
          </Label>
        </div>
      ))}
    </div>
  );
}

function RatingField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl leading-none transition-colors ${n <= value ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-200"}`}
          aria-label={`Rate ${n} out of 5`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function DynamicFormRenderer({
  fields,
  projectId,
  onSubmit,
  isPending,
}: DynamicFormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitterName, setSubmitterName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: members } = useProjectMembers(projectId);

  function setFieldValue(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const f of fields) {
      if (!f.required) continue;
      const v = values[f.key];
      if (f.type === "checkbox") continue;
      if (f.type === "multiselect" && Array.isArray(v) && v.length > 0) continue;
      if (v !== undefined && v !== "" && v !== null) continue;
      next[f.key] = `${f.label || f.key} is required`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit(values, submitterName.trim() || undefined);
  }

  function handleSubmitterNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSubmitterName(e.target.value);
  }

  return (
    <div className="space-y-4 py-1">
      {fields.map((field) => {
        const val = values[field.key];
        const strVal = typeof val === "string" ? val : "";
        const numVal = typeof val === "number" ? val : 0;
        const boolVal = typeof val === "boolean" ? val : false;
        const arrVal = Array.isArray(val) ? (val as string[]) : [];

        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm">
              {field.label || field.key}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {field.type === "text" && (
              <Input value={strVal} onChange={(e) => setFieldValue(field.key, e.target.value)} className="text-sm" />
            )}
            {field.type === "long_text" && (
              <Textarea value={strVal} onChange={(e) => setFieldValue(field.key, e.target.value)} className="text-sm resize-none h-20" />
            )}
            {(field.type === "number" || field.type === "currency") && (
              <Input
                type="number"
                value={numVal || ""}
                onChange={(e) => setFieldValue(field.key, parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
            )}
            {field.type === "date" && (
              <DatePicker value={strVal} onChange={(v) => setFieldValue(field.key, v)} placeholder="Pick a date" className="text-sm" />
            )}
            {field.type === "url" && (
              <Input type="url" value={strVal} onChange={(e) => setFieldValue(field.key, e.target.value)} className="text-sm" placeholder="https://" />
            )}
            {field.type === "dropdown" && (
              <Select value={strVal} onValueChange={(v) => setFieldValue(field.key, v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {field.type === "multiselect" && (
              <MultiSelectField
                field={field}
                value={arrVal}
                onChange={(v) => setFieldValue(field.key, v)}
              />
            )}
            {field.type === "checkbox" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={boolVal}
                  onCheckedChange={(v) => setFieldValue(field.key, !!v)}
                  id={`f-${field.key}`}
                />
                <Label htmlFor={`f-${field.key}`} className="text-sm font-normal cursor-pointer">
                  {field.label}
                </Label>
              </div>
            )}
            {field.type === "user" && (
              <Select value={strVal} onValueChange={(v) => setFieldValue(field.key, v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select user…" /></SelectTrigger>
                <SelectContent>
                  {(members ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {getUserDisplayName(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {field.type === "rating" && (
              <RatingField value={numVal} onChange={(v) => setFieldValue(field.key, v)} />
            )}
            {errors[field.key] && (
              <p className="text-xs text-destructive">{errors[field.key]}</p>
            )}
          </div>
        );
      })}

      <div className="space-y-1.5 pt-2 border-t">
        <Label className="text-sm">Your name <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          value={submitterName}
          onChange={handleSubmitterNameChange}
          className="text-sm"
          placeholder="Optional"
        />
      </div>

      <div className="flex justify-end pt-2">
        <LoadingButton size="sm" onClick={handleSubmit} isPending={isPending} loadingText="Submitting…">
          Submit
        </LoadingButton>
      </div>
    </div>
  );
}
