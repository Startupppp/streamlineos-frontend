"use client";

import { useCallback, useEffect } from "react";
import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { useUpdateTimesheetPayrollSettings } from "@/hooks/api/timesheets/payroll";
import type { PayrollSettings, PayrollMapping, PayrollProvider } from "./types";

const PROVIDER_HEADER_PRESETS: Record<PayrollProvider, Record<string, string>> = {
  GENERIC: {},
  ZOHO_PAYROLL: {
    employeeName: "Employee Name",
    employeeEmail: "Email",
    employeeId: "Employee ID",
    periodStart: "Pay Period Start",
    periodEnd: "Pay Period End",
    regularHours: "Regular Hours",
    overtimeHours: "Overtime Hours",
    holidayHours: "Holiday Hours",
    weekendHours: "Weekend Hours",
    breakHours: "Break Hours",
    leaveDays: "Leave Days",
    billableHours: "Billable Hours",
    nonBillableHours: "Non-Billable Hours",
    totalPayableHours: "Total Payable Hours",
    entryCount: "Entry Count",
  },
  RAZORPAYX: {
    employeeName: "Name",
    employeeEmail: "Email ID",
    employeeId: "Employee Code",
    periodStart: "From Date",
    periodEnd: "To Date",
    regularHours: "Regular",
    overtimeHours: "OT Hours",
    holidayHours: "Holiday",
    weekendHours: "Weekend",
    breakHours: "Break",
    leaveDays: "Leave Days",
    billableHours: "Billable",
    nonBillableHours: "Non-Billable",
    totalPayableHours: "Payable Hours",
    entryCount: "Entries",
  },
  ADP: {
    employeeName: "Employee Name",
    employeeEmail: "Work Email",
    employeeId: "Associate ID",
    periodStart: "Period Begin Date",
    periodEnd: "Period End Date",
    regularHours: "Regular Hours",
    overtimeHours: "Overtime Hours",
    holidayHours: "Holiday Hours",
    weekendHours: "Weekend Hours",
    breakHours: "Break Hours",
    leaveDays: "Leave Days",
    billableHours: "Billable Hours",
    nonBillableHours: "Non-Billable",
    totalPayableHours: "Total Hours",
    entryCount: "Entry Count",
  },
  GUSTO: {
    employeeName: "Full Name",
    employeeEmail: "Email",
    employeeId: "Employee ID",
    periodStart: "Start Date",
    periodEnd: "End Date",
    regularHours: "Regular Hours",
    overtimeHours: "Overtime Hours",
    holidayHours: "Holiday Hours",
    weekendHours: "Weekend Hours",
    breakHours: "Break Hours",
    leaveDays: "Leave Days",
    billableHours: "Billable Hours",
    nonBillableHours: "Non-Billable Hours",
    totalPayableHours: "Payable Hours",
    entryCount: "Count",
  },
};

const columnSchema = z.object({
  key: z.string(),
  header: z.string().min(1, "Header required"),
  enabled: z.boolean(),
});

const mappingFormSchema = z.object({
  provider: z.enum(["GENERIC", "ZOHO_PAYROLL", "RAZORPAYX", "ADP", "GUSTO"]),
  columns: z.array(columnSchema),
});

type MappingFormValues = z.infer<typeof mappingFormSchema>;

interface PayrollMappingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PayrollSettings;
}

interface MappingColumnRowProps {
  form: UseFormReturn<MappingFormValues>;
  index: number;
  columnKey: string;
}

function MappingColumnRow({ form, index, columnKey }: MappingColumnRowProps) {
  const enabled = form.watch(`columns.${index}.enabled`);

  const handleEnabledChange = useCallback(
    (checked: boolean) => form.setValue(`columns.${index}.enabled`, checked),
    [form, index],
  );

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={enabled}
        onCheckedChange={handleEnabledChange}
        aria-label={`Enable ${columnKey}`}
      />
      <span className="text-[10px] text-muted-foreground w-28 shrink-0 truncate font-mono">
        {columnKey}
      </span>
      <Input
        className="h-8 text-xs flex-1"
        {...form.register(`columns.${index}.header`)}
        aria-label={`Header for ${columnKey}`}
      />
      {form.formState.errors.columns?.[index]?.header && (
        <p className="text-xs text-destructive">{form.formState.errors.columns[index].header?.message}</p>
      )}
    </div>
  );
}

export function PayrollMappingSheet({
  open,
  onOpenChange,
  settings,
}: PayrollMappingSheetProps) {
  const updateSettings = useUpdateTimesheetPayrollSettings();

  const form = useForm<MappingFormValues>({
    resolver: zodResolver(mappingFormSchema),
    defaultValues: {
      provider: settings.payrollMapping.provider,
      columns: settings.payrollMapping.columns,
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: "columns" });

  useEffect(() => {
    if (open) {
      form.reset({
        provider: settings.payrollMapping.provider,
        columns: settings.payrollMapping.columns,
      });
    }
  }, [open, settings, form]);

  const handleProviderChange = useCallback(
    (value: string) => {
      const provider = value as PayrollProvider;
      form.setValue("provider", provider);
      const presets = PROVIDER_HEADER_PRESETS[provider];
      const current = form.getValues("columns");
      const updated = current.map((col) => ({
        ...col,
        header: presets[col.key] ?? col.header,
      }));
      form.setValue("columns", updated);
    },
    [form],
  );

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleSubmit = form.handleSubmit((values) => {
    const mapping: PayrollMapping = {
      provider: values.provider,
      columns: values.columns,
    };
    updateSettings.mutate(
      { payrollMapping: mapping },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Column Mapping</SheetTitle>
          <p className="text-xs text-muted-foreground">Configure payroll export columns per provider.</p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <SheetBody className="px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Provider</Label>
              <Select value={form.watch("provider")} onValueChange={handleProviderChange}>
                <SelectTrigger className="h-9" aria-label="Payroll provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERIC">Generic</SelectItem>
                  <SelectItem value="ZOHO_PAYROLL">Zoho Payroll</SelectItem>
                  <SelectItem value="RAZORPAYX">RazorpayX</SelectItem>
                  <SelectItem value="ADP">ADP</SelectItem>
                  <SelectItem value="GUSTO">Gusto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Columns</p>
              <div className="space-y-1.5">
                {fields.map((field, index) => (
                  <MappingColumnRow
                    key={field.id}
                    form={form}
                    index={index}
                    columnKey={field.key}
                  />
                ))}
              </div>
            </div>
          </SheetBody>

          <SheetFooter className="border-t px-6 py-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isPending={updateSettings.isPending}
              loadingText="Saving…"
            >
              Save Mapping
            </LoadingButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
