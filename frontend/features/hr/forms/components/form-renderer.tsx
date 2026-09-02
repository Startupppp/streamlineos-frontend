"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { HrFormField, SubmitHrFormPayload } from "../lib/types";
import { toggleListMembership } from "@/lib/toggle-in-list";

interface FormRendererProps {
  fields: HrFormField[];
  onSubmit: (payload: SubmitHrFormPayload) => Promise<void>;
  isPending: boolean;
  readOnly?: boolean;
  initialData?: Record<string, unknown>;
}

function isFieldVisible(field: HrFormField, data: Record<string, unknown>): boolean {
  if (!field.conditional) return true;
  const { fieldKey, operator, value } = field.conditional;
  const v = data[fieldKey];
  switch (operator) {
    case "notEmpty": return v !== null && v !== undefined && v !== "";
    case "eq": return v === value;
    case "neq": return v !== value;
    case "contains":
      return typeof v === "string" && typeof value === "string" && v.includes(value);
    default: return true;
  }
}

export function FormRenderer({ fields, onSubmit, isPending, readOnly = false, initialData = {} }: FormRendererProps) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setValue(key: string, v: unknown) {
    setData((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function handleInputChange(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(key, e.target.value);
  }

  function validate(): boolean {
    const visibleFields = fields.filter((f) => isFieldVisible(f, data));
    const next: Record<string, string> = {};
    for (const f of visibleFields) {
      if (!f.required) continue;
      const v = data[f.key];
      if (f.type === "boolean") continue;
      if (f.type === "multi_select" && Array.isArray(v) && v.length > 0) continue;
      if (v !== undefined && v !== "" && v !== null) continue;
      next[f.key] = `${f.label} is required`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      await onSubmit({ data });
      toast.success("Form submitted successfully");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const visibleFields = fields.filter((f) => isFieldVisible(f, data));

  return (
    <div className="space-y-4">
      {visibleFields.map((field) => {
        const val = data[field.key];
        const strVal = typeof val === "string" ? val : "";
        const boolVal = typeof val === "boolean" ? val : false;
        const arrVal = Array.isArray(val) ? (val as string[]) : [];
        const numVal = typeof val === "number" ? val : "";

        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
              {field.sensitive && !readOnly && (
                <span className="ml-1 text-micro text-status-warning-ink font-normal">(sensitive)</span>
              )}
            </Label>

            {(field.type === "text" || field.type === "employee_ref" || field.type === "department_ref") && (
              <Input
                value={strVal}
                onChange={handleInputChange(field.key)}
                className="text-sm"
                readOnly={readOnly}
              />
            )}
            {field.type === "long_text" && (
              <Textarea
                value={strVal}
                onChange={handleInputChange(field.key)}
                className="text-sm resize-none h-20"
                readOnly={readOnly}
              />
            )}
            {(field.type === "number" || field.type === "currency") && (
              <Input
                type="number"
                value={numVal}
                onChange={(e) => setValue(field.key, parseFloat(e.target.value) || 0)}
                className="text-sm"
                readOnly={readOnly}
              />
            )}
            {field.type === "date" && (
              <Input
                type="date"
                value={strVal}
                onChange={handleInputChange(field.key)}
                className="text-sm"
                readOnly={readOnly}
              />
            )}
            {field.type === "select" && !readOnly && (
              <Select value={strVal} onValueChange={(v) => setValue(field.key, v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {field.type === "select" && readOnly && (
              <Input value={strVal} readOnly className="text-sm" />
            )}
            {field.type === "multi_select" && (
              <div className="flex flex-wrap gap-2">
                {(field.options ?? []).map((opt) => (
                  <div key={opt.value} className="flex items-center gap-1.5">
                    <Checkbox
                      checked={arrVal.includes(opt.value)}
                      disabled={readOnly}
                      onCheckedChange={() =>
                        setValue(field.key, toggleListMembership(arrVal, opt.value))
                      }
                      id={`${field.key}-${opt.value}`}
                    />
                    <Label htmlFor={`${field.key}-${opt.value}`} className="text-sm font-normal cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            {field.type === "boolean" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={boolVal}
                  disabled={readOnly}
                  onCheckedChange={(v) => setValue(field.key, !!v)}
                  id={`f-${field.key}`}
                />
                <Label htmlFor={`f-${field.key}`} className="text-sm font-normal cursor-pointer">Yes</Label>
              </div>
            )}
            {field.type === "file" && !readOnly && (
              <Input type="file" onChange={(e) => setValue(field.key, e.target.files?.[0]?.name ?? "")} className="text-sm" />
            )}
            {field.type === "file" && readOnly && (
              <Input value={strVal} readOnly className="text-sm" />
            )}

            {errors[field.key] && (
              <p className="text-xs text-destructive">{errors[field.key]}</p>
            )}
          </div>
        );
      })}

      {!readOnly && (
        <div className="flex justify-end pt-2 border-t">
          <LoadingButton size="sm" isPending={isPending} onClick={handleSubmit}>
            Submit
          </LoadingButton>
        </div>
      )}
    </div>
  );
}
