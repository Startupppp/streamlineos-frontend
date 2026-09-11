"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../../lib/validation/hr";

import { Input } from "../../ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useSalaryStructureTemplates } from "@/hooks/api/hr/salary-structures";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import {
  DEFAULT_SALARY_SPLIT,
  applySalarySplit,
  splitFromTemplate,
} from "@/lib/salary-split";
import { formatINR } from "@/lib/format-utils";
import { codeFieldChange } from "@/lib/code-field";
import { numericFieldChange, numericFieldValue } from "@/lib/numeric-field";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

const DEFAULT_TEMPLATE_VALUE = "default";

/**
 * The select's sentinel row means "no template", which is `undefined` rather
 * than a number. Everything else is a numeric id.
 */
function makeTemplateChange(
  onChange: (value: number | undefined) => void,
): (value: string) => void {
  return function handleTemplateChange(value) {
    onChange(value === DEFAULT_TEMPLATE_VALUE ? undefined : numericFieldValue(value));
  };
}

function formatRoundedInr(value: number): string {
  return formatINR(Math.round(value));
}

interface StepSkillsPayProps {
  form: UseFormReturn<FormValues>;
}

export function StepSkillsPay({ form }: StepSkillsPayProps) {
  const payrollEnabled = useModuleEnabled("payroll");
  const canViewSalary = useCan("hr:salary:view");
  const canUseTemplates = payrollEnabled && canViewSalary;
  const { data: templates } = useSalaryStructureTemplates({
    enabled: canUseTemplates,
  });

  const monthlySalary = Number(form.watch("monthlySalary")) || 0;
  const templateId = form.watch("salaryStructureTemplateId");
  const selectedTemplate = templates?.data.find((t) => t.id === templateId);
  const split = selectedTemplate
    ? splitFromTemplate(selectedTemplate)
    : DEFAULT_SALARY_SPLIT;
  const breakdown = applySalarySplit(monthlySalary, split);
  const breakdownPercents = {
    basic: Math.round(split.basicPercent),
    hra: Math.round(split.hraPercent),
  };

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="taxId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>PAN Number</FormLabel>
            <FormControl>
              <Input
                placeholder="ABCDE1234F"
                maxLength={10}
                {...field}
                onChange={codeFieldChange(field.onChange, 10)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="pt-4 border-t border-border">
        <h3 className="text-base font-semibold mb-4">Salary Information</h3>
        <FormField
          control={form.control}
          name="monthlySalary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Salary (CTC) <span className="text-status-danger-ink">*</span></FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">&#8377;</span>
                  <Input
                    type="number"
                    placeholder="25000"
                    value={field.value ?? ""}
                    onChange={numericFieldChange(field.onChange)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    className="pl-8"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {canUseTemplates && templates && templates.data.length > 0 && (
          <FormField
            control={form.control}
            name="salaryStructureTemplateId"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel>Salary Structure</FormLabel>
                <Select
                  value={field.value ? String(field.value) : DEFAULT_TEMPLATE_VALUE}
                  onValueChange={makeTemplateChange(field.onChange)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value={DEFAULT_TEMPLATE_VALUE}>
                      Organisation default
                    </SelectItem>
                    {templates.data.map((template) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Sets how this salary is split into components. Manage
                  structures under Payroll → Salary Structures.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {monthlySalary > 0 && (
          <div className="mt-4 p-4 bg-muted/40 rounded-lg border text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">
                Basic Pay ({breakdownPercents.basic}% of CTC):
              </span>
              <span className="font-medium tabular-nums">{formatRoundedInr(breakdown.basic)}</span>
              <span className="text-muted-foreground">
                HRA ({breakdownPercents.hra}% of basic):
              </span>
              <span className="font-medium tabular-nums">{formatRoundedInr(breakdown.hra)}</span>
              <span className="text-muted-foreground">Other allowances:</span>
              <span className="font-medium tabular-nums">{formatRoundedInr(breakdown.balance)}</span>
              <span className="text-muted-foreground">Professional Tax:</span>
              <span className="font-medium text-status-danger-ink tabular-nums">
                -{formatRoundedInr(breakdown.professionalTax)}
              </span>
              <span className="text-muted-foreground font-semibold border-t pt-2">
                Net Salary:
              </span>
              <span className="font-bold text-status-success-ink border-t pt-2 tabular-nums">
                {formatRoundedInr(breakdown.net)}
              </span>
            </div>
            <p className="mt-3 text-dense leading-relaxed text-muted-foreground">
              Basic and HRA are saved exactly as shown. The remaining balance is
              allocated across your organisation&apos;s payroll components.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
