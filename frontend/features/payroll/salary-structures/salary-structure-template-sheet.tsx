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
import { HrSheet } from "@/components/shared/hr-sheet";
import { formatINR } from "@/lib/format-utils";
import type { SalaryStructureTemplate, CreateSalaryTemplateInput } from "@/hooks/api/hr/salary-structures";
import { estimateTemplateNet } from "./salary-structure-template-preview";

const NON_NEGATIVE_DECIMAL = /^\d+(\.\d{1,2})?$/;

function money(requiredMessage: string) {
  return z
    .string()
    .min(1, requiredMessage)
    .regex(NON_NEGATIVE_DECIMAL, "Enter an amount of zero or more");
}

function percent(requiredMessage: string) {
  return z
    .string()
    .min(1, requiredMessage)
    .regex(NON_NEGATIVE_DECIMAL, "Enter a percentage between 0 and 100")
    .refine((v) => Number(v) <= 100, "Enter a percentage between 0 and 100");
}

function optionalMoney() {
  return money("Enter an amount of zero or more").nullable();
}

const templateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .refine((v) => /[a-zA-Z0-9]/.test(v), "Name must contain at least one letter or digit"),
  basicSalary: money("Basic salary is required"),
  hraPercent: percent("HRA % is required"),
  specialAllowance: optionalMoney(),
  medicalAllowance: optionalMoney(),
  travelAllowance: optionalMoney(),
  otherAllowances: optionalMoney(),
  pfDeductionPercent: percent("PF deduction % is required").nullable(),
  professionalTax: optionalMoney(),
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

function FieldGroup({
  label,
  error,
  children,
}: {
  label: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function CtcPreview({ values }: { values: TemplateFormValues }) {
  const basic = parseFloat(values.basicSalary || "0") || 0;
  const hraPercent = parseFloat(values.hraPercent || "0") || 0;
  const special = parseFloat(values.specialAllowance || "0") || 0;
  const medical = parseFloat(values.medicalAllowance || "0") || 0;
  const travel = parseFloat(values.travelAllowance || "0") || 0;
  const other = parseFloat(values.otherAllowances || "0") || 0;
  const pfPercent = parseFloat(values.pfDeductionPercent || "0") || 0;
  const profTax = parseFloat(values.professionalTax || "0") || 0;

  const hra = basic * hraPercent / 100;
  const gross = basic + hra + special + medical + travel + other;
  const pfDeduction = basic * pfPercent / 100;
  const preview = estimateTemplateNet(values);

  const rows: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: "Basic", value: formatINR(basic) },
    { label: "HRA", value: formatINR(hra) },
    { label: "Special Allowance", value: formatINR(special) },
    { label: "Medical Allowance", value: formatINR(medical) },
    { label: "Travel Allowance", value: formatINR(travel) },
    { label: "Other Allowances", value: formatINR(other) },
    { label: "Gross", value: formatINR(gross), highlight: true },
    { label: "PF Deduction", value: `− ${formatINR(pfDeduction)}` },
    { label: "Professional Tax", value: `− ${formatINR(profTax)}` },
    {
      label: "Estimated Net",
      value: preview.valid ? formatINR(preview.net) : "Invalid",
      highlight: true,
    },
  ];

  return (
    <div className="rounded-xl bg-primary/5 border border-border px-4 py-3 space-y-1.5">
      <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Live CTC Preview
      </p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between">
          <span className={`text-xs ${row.highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            {row.label}
          </span>
          <span className={`text-xs tabular-nums ${row.highlight ? "font-bold text-foreground" : "text-foreground"}`}>
            {row.value}
          </span>
        </div>
      ))}
      {!preview.valid && (
        <p className="text-xs text-destructive pt-1">
          {values.basicSalary.trim() === ""
            ? "Enter a basic salary before this preview is a payable estimate."
            : preview.hasNegativeComponent
              ? "A salary component cannot be negative. Enter zero or more in every amount."
              : "Estimated net cannot be negative. Raise basic salary or lower deductions."}
        </p>
      )}
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
  const preview = estimateTemplateNet(watchedValues);
  const canSubmit =
    watchedValues.name.trim() !== "" &&
    watchedValues.effectiveFrom.trim() !== "" &&
    preview.valid;

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
      name: values.name.replace(/\s+/g, " ").trim(),
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
      submitDisabled={!canSubmit}
    >
      <FieldGroup label={<>Template Name <span className="text-destructive">*</span></>} error={errors.name?.message}>
        <Input
          {...register("name")}
          placeholder="e.g. Senior Engineer L3"
          className=""
        />
      </FieldGroup>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label={<>Basic Salary (₹) <span className="text-destructive">*</span></>} error={errors.basicSalary?.message}>
          <Input
            {...register("basicSalary")}
            type="number"
            min="0"
            placeholder="50000"
            className=""
          />
        </FieldGroup>
        <FieldGroup label="HRA %" error={errors.hraPercent?.message}>
          <Input
            {...register("hraPercent")}
            type="number"
            min="0"
            max="100"
            placeholder="40"
            className=""
          />
        </FieldGroup>
      </div>

      <CtcPreview values={watchedValues} />

      <Separator />

      <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
        Allowances
      </p>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Special Allowance (₹)" error={errors.specialAllowance?.message}>
          <Input
            {...register("specialAllowance")}
            type="number"
            min="0"
            placeholder="0"
            className=""
          />
        </FieldGroup>
        <FieldGroup label="Medical Allowance (₹)" error={errors.medicalAllowance?.message}>
          <Input
            {...register("medicalAllowance")}
            type="number"
            min="0"
            placeholder="0"
            className=""
          />
        </FieldGroup>
        <FieldGroup label="Travel Allowance (₹)" error={errors.travelAllowance?.message}>
          <Input
            {...register("travelAllowance")}
            type="number"
            min="0"
            placeholder="0"
            className=""
          />
        </FieldGroup>
        <FieldGroup label="Other Allowances (₹)" error={errors.otherAllowances?.message}>
          <Input
            {...register("otherAllowances")}
            type="number"
            min="0"
            placeholder="0"
            className=""
          />
        </FieldGroup>
      </div>

      <Separator />

      <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
        Deductions
      </p>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="PF Deduction %" error={errors.pfDeductionPercent?.message}>
          <Input
            {...register("pfDeductionPercent")}
            type="number"
            min="0"
            max="100"
            placeholder="12"
            className=""
          />
        </FieldGroup>
        <FieldGroup label="Professional Tax (₹)" error={errors.professionalTax?.message}>
          <Input
            {...register("professionalTax")}
            type="number"
            min="0"
            placeholder="200"
            className=""
          />
        </FieldGroup>
      </div>

      <Separator />

      <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
        Validity
      </p>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label={<>Effective From <span className="text-destructive">*</span></>} error={errors.effectiveFrom?.message}>
          <Controller
            name="effectiveFrom"
            control={control}
            render={({ field }) => (
              <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
            )}
          />
        </FieldGroup>
        <FieldGroup label="Effective To (optional)">
          <Controller
            name="effectiveTo"
            control={control}
            render={({ field }) => (
              <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
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
