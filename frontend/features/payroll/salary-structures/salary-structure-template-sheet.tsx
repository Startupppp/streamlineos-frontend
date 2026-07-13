"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { HrSheet } from "@/features/hr/hr-sheet";
import type { SalaryStructureTemplate, CreateSalaryTemplateInput } from "@/hooks/api/hr/salary-structures";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  basicSalary: z.string().min(1, "Basic salary is required"),
  hraPercent: z.string().min(1, "HRA % is required"),
  specialAllowance: z.string().nullable(),
  medicalAllowance: z.string().nullable(),
  travelAllowance: z.string().nullable(),
  otherAllowances: z.string().nullable(),
  pfDeductionPercent: z.string().nullable(),
  professionalTax: z.string().nullable(),
  effectiveFrom: z.string().min(1, "Effective from is required"),
  effectiveTo: z.string().nullable(),
  isActive: z.boolean(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface SalaryStructureTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: SalaryStructureTemplate;
  onSubmit: (data: CreateSalaryTemplateInput) => void;
  isPending: boolean;
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}

function CtcPreview({ values }: { values: TemplateFormValues }) {
  const basic = parseFloat(values.basicSalary || "0");
  const hraPercent = parseFloat(values.hraPercent || "0");
  const special = parseFloat(values.specialAllowance || "0");
  const medical = parseFloat(values.medicalAllowance || "0");
  const travel = parseFloat(values.travelAllowance || "0");
  const other = parseFloat(values.otherAllowances || "0");
  const pfPercent = parseFloat(values.pfDeductionPercent || "0");
  const profTax = parseFloat(values.professionalTax || "0");

  const hra = basic * hraPercent / 100;
  const gross = basic + hra + special + medical + travel + other;
  const pfDeduction = basic * pfPercent / 100;
  const estimatedNet = gross - pfDeduction - profTax;

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  const rows: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: "Basic", value: fmt(basic) },
    { label: "HRA", value: fmt(hra) },
    { label: "Special Allowance", value: fmt(special) },
    { label: "Medical Allowance", value: fmt(medical) },
    { label: "Travel Allowance", value: fmt(travel) },
    { label: "Other Allowances", value: fmt(other) },
    { label: "Gross", value: fmt(gross), highlight: true },
    { label: "PF Deduction", value: `− ${fmt(pfDeduction)}` },
    { label: "Professional Tax", value: `− ${fmt(profTax)}` },
    { label: "Estimated Net", value: fmt(estimatedNet), highlight: true },
  ];

  return (
    <div className="rounded-xl bg-violet-50 border border-violet-200/80 px-4 py-3 space-y-1.5 dark:bg-violet-500/10 dark:border-violet-500/30">
      <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
        Live CTC Preview
      </p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between">
          <span className={`text-xs ${row.highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            {row.label}
          </span>
          <span className={`text-xs tabular-nums ${row.highlight ? "font-bold text-violet-700 dark:text-violet-300" : "text-foreground"}`}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SalaryStructureTemplateSheet({
  open,
  onOpenChange,
  template,
  onSubmit,
  isPending,
}: SalaryStructureTemplateSheetProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      basicSalary: "",
      hraPercent: "40",
      specialAllowance: "0",
      medicalAllowance: "0",
      travelAllowance: "0",
      otherAllowances: "0",
      pfDeductionPercent: "12",
      professionalTax: "200",
      effectiveFrom: "",
      effectiveTo: null,
      isActive: true,
    },
  });

  const watchedValues = watch();
  const isActiveValue = watch("isActive");

  useEffect(() => {
    if (open) {
      if (template) {
        reset({
          name: template.name,
          basicSalary: template.basicSalary,
          hraPercent: template.hraPercent,
          specialAllowance: template.specialAllowance ?? "0",
          medicalAllowance: template.medicalAllowance ?? "0",
          travelAllowance: template.travelAllowance ?? "0",
          otherAllowances: template.otherAllowances ?? "0",
          pfDeductionPercent: template.pfDeductionPercent ?? "12",
          professionalTax: template.professionalTax ?? "200",
          effectiveFrom: template.effectiveFrom,
          effectiveTo: template.effectiveTo ?? null,
          isActive: template.isActive,
        });
      } else {
        reset({
          name: "",
          basicSalary: "",
          hraPercent: "40",
          specialAllowance: "0",
          medicalAllowance: "0",
          travelAllowance: "0",
          otherAllowances: "0",
          pfDeductionPercent: "12",
          professionalTax: "200",
          effectiveFrom: "",
          effectiveTo: null,
          isActive: true,
        });
      }
    }
  }, [open, template, reset]);

  function handleFormSubmit(values: TemplateFormValues) {
    onSubmit({
      name: values.name,
      basicSalary: values.basicSalary,
      hraPercent: values.hraPercent,
      specialAllowance: values.specialAllowance,
      medicalAllowance: values.medicalAllowance,
      travelAllowance: values.travelAllowance,
      otherAllowances: values.otherAllowances,
      pfDeductionPercent: values.pfDeductionPercent,
      professionalTax: values.professionalTax,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo,
      isActive: values.isActive,
    });
  }

  function handleActiveChange(checked: boolean) {
    setValue("isActive", checked);
  }

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={template ? "Edit Salary Template" : "Add Salary Template"}
      description="Define the salary components that make up this structure template."
      onSubmit={handleSubmit(handleFormSubmit)}
      submitLabel={template ? "Save Changes" : "Create Template"}
      isPending={isPending}
    >
      <FieldGroup label="Template Name">
        <Input
          {...register("name")}
          placeholder="e.g. Senior Engineer L3"
          className="h-9"
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
        )}
      </FieldGroup>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Basic Salary (₹)">
          <Input
            {...register("basicSalary")}
            type="number"
            min="0"
            placeholder="50000"
            className="h-9"
          />
          {errors.basicSalary && (
            <p className="text-xs text-destructive mt-1">{errors.basicSalary.message}</p>
          )}
        </FieldGroup>
        <FieldGroup label="HRA %">
          <Input
            {...register("hraPercent")}
            type="number"
            min="0"
            max="100"
            placeholder="40"
            className="h-9"
          />
        </FieldGroup>
      </div>

      <CtcPreview values={watchedValues} />

      <Separator />

      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Allowances
      </p>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Special Allowance (₹)">
          <Input
            {...register("specialAllowance")}
            type="number"
            min="0"
            placeholder="0"
            className="h-9"
          />
        </FieldGroup>
        <FieldGroup label="Medical Allowance (₹)">
          <Input
            {...register("medicalAllowance")}
            type="number"
            min="0"
            placeholder="0"
            className="h-9"
          />
        </FieldGroup>
        <FieldGroup label="Travel Allowance (₹)">
          <Input
            {...register("travelAllowance")}
            type="number"
            min="0"
            placeholder="0"
            className="h-9"
          />
        </FieldGroup>
        <FieldGroup label="Other Allowances (₹)">
          <Input
            {...register("otherAllowances")}
            type="number"
            min="0"
            placeholder="0"
            className="h-9"
          />
        </FieldGroup>
      </div>

      <Separator />

      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Deductions
      </p>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="PF Deduction %">
          <Input
            {...register("pfDeductionPercent")}
            type="number"
            min="0"
            max="100"
            placeholder="12"
            className="h-9"
          />
        </FieldGroup>
        <FieldGroup label="Professional Tax (₹)">
          <Input
            {...register("professionalTax")}
            type="number"
            min="0"
            placeholder="200"
            className="h-9"
          />
        </FieldGroup>
      </div>

      <Separator />

      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Validity
      </p>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Effective From">
          <Controller
            name="effectiveFrom"
            control={control}
            render={({ field }) => (
              <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
            )}
          />
          {errors.effectiveFrom && (
            <p className="text-xs text-destructive mt-1">{errors.effectiveFrom.message}</p>
          )}
        </FieldGroup>
        <FieldGroup label="Effective To (optional)">
          <Controller
            name="effectiveTo"
            control={control}
            render={({ field }) => (
              <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
            )}
          />
        </FieldGroup>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Active</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active templates can be assigned to employees
          </p>
        </div>
        <Switch
          checked={isActiveValue}
          onCheckedChange={handleActiveChange}
        />
      </div>
    </HrSheet>
  );
}
