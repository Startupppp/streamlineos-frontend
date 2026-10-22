"use client";

import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePayrollTemplates } from "@/hooks/api/payroll/templates";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import { useCanState } from "@/hooks/api/access";
import type { PayrollTemplate } from "@/hooks/api/payroll/templates-schema";
import type { SalaryComponentListItem } from "@/hooks/api/payroll/components-schema";

/** The active components a template names, matched by code. */
export function componentIdsForTemplate(
  template: Pick<PayrollTemplate, "defaultComponents">,
  components: readonly Pick<SalaryComponentListItem, "id" | "code">[],
): number[] {
  const codes = new Set(template.defaultComponents.map((c) => c.code));
  return components.filter((c) => codes.has(c.code)).map((c) => c.id);
}

interface ProfileTemplatePickerProps {
  components: readonly SalaryComponentListItem[];
  onApply: (componentIds: number[]) => void;
}

// Per-employee structure (#26): "Use in Setup" is org-wide, so this lets one
// profile start from a different template's components.
export function ProfileTemplatePicker({ components, onApply }: ProfileTemplatePickerProps) {
  const id = useId();
  const canView = useCanState("payroll:templates:view") === "granted";
  const { data: policyData } = usePayrollPolicyCurrent();
  const { data } = usePayrollTemplates({ country: policyData?.policy?.country });
  const templates = data?.items ?? [];

  function handleValueChange(value: string) {
    const template = templates.find((t) => String(t.id) === value);
    if (template) onApply(componentIdsForTemplate(template, components));
  }

  if (!canView || templates.length === 0) return null;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Start from a template
      </label>
      <Select onValueChange={handleValueChange}>
        <SelectTrigger id={id} className="h-8 text-xs">
          <SelectValue placeholder="Pick a salary template" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={String(template.id)}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
