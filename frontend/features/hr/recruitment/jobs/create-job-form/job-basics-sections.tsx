"use client";

import { UseFormReturn, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import type { CreateJobFormValues } from "./schema";
import type { Department } from "@/types/hr";
import { useBranchOptions } from "@/hooks/api";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Briefcase, MapPin } from "lucide-react";
import { JobTemplatePicker } from "./job-template-picker";

export interface SectionProps {
  form: UseFormReturn<CreateJobFormValues>;
  departments?: Department[];
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-dense text-status-danger-ink mt-1 font-medium">{message}</p>;
}

export function SectionTitle({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-5 pb-4 border-b border-border">
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className={cn("text-xs text-muted-foreground", Icon && "ml-9")}>{subtitle}</p>
    </div>
  );
}

export function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground/80">
        {label}
        {required && <span className="text-status-danger-ink ml-0.5">*</span>}
      </Label>
      {hint && <p className="text-micro text-muted-foreground">{hint}</p>}
      {children}
      {error && <FieldError message={error} />}
    </div>
  );
}

export function ToggleRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function Section1({ form, departments }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Basic Job Details" subtitle="Core information about the position" icon={Briefcase} />
      <FieldGroup>
        {/* First, because a template is worth choosing before typing — it only fills blanks, so picking it later fills less. */}
        <JobTemplatePicker form={form} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Job Title" required error={errors.title?.message}>
            <Input placeholder="e.g. Software Engineer, HR Manager" {...register("title")} />
          </Field>
          <Field label="Department" required error={errors.departmentId?.message}>
            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {departments && departments.length > 0 ? (
                      departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        <Field label="Role" required error={errors.role?.message}>
          <Input placeholder="e.g. Frontend Developer, Recruiter, Accountant" {...register("role")} />
        </Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Job Type" required error={errors.jobType?.message}>
            <Controller
              name="jobType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="FULL_TIME">Full-Time</SelectItem>
                    <SelectItem value="PART_TIME">Part-Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                    <SelectItem value="FREELANCE">Freelance</SelectItem>
                    <SelectItem value="TEMPORARY">Temporary</SelectItem>
                    <SelectItem value="CONSULTANT">Consultant</SelectItem>
                    <SelectItem value="APPRENTICESHIP">Apprenticeship</SelectItem>
                    <SelectItem value="COMMISSION_BASED">Commission Based</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Work Mode" required error={errors.workMode?.message}>
            <Controller
              name="workMode"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="ONSITE">On-site</SelectItem>
                    <SelectItem value="REMOTE">Remote</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Openings" required error={errors.openings?.message}>
            <Input type="number" min={1} placeholder="e.g. 1" {...register("openings", { valueAsNumber: true })} />
          </Field>
        </div>
      </FieldGroup>
    </div>
  );
}

export function Section2({ form }: SectionProps) {
  const { register, control, setValue, formState: { errors } } = form;
  const { data: branches } = useBranchOptions();
  const branchOptions = useMemo<ComboboxOption[]>(
    () =>
      (branches?.data ?? []).map((b) => ({
        value: b.id,
        label: b.name,
        sublabel: [b.city, b.state, b.country].filter(Boolean).join(", "),
      })),
    [branches],
  );

  function handleBranchSelect(branchId: string) {
    const branch = (branches?.data ?? []).find((b) => b.id === branchId);
    if (!branch) return;
    if (branch.country) setValue("country", branch.country, { shouldValidate: true });
    const cityState = [branch.city, branch.state].filter(Boolean).join(", ");
    if (cityState) setValue("stateCity", cityState, { shouldValidate: true });
    setValue("officeLocation", branch.name, { shouldValidate: true });
  }

  return (
    <div>
      <SectionTitle title="Location Details" subtitle="Where this role is based" icon={MapPin} />
      <FieldGroup>
        {branchOptions.length > 0 && (
          <Field label="Auto-fill from Branch" hint="Selecting a branch pre-fills the fields below">
            <Combobox
              options={branchOptions}
              value=""
              onChange={handleBranchSelect}
              placeholder="Select a branch to auto-fill location…"
              searchPlaceholder="Search branches…"
            />
          </Field>
        )}

        <Field label="Country" required error={errors.country?.message}>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="e.g. India, USA, UK" /></SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="UAE">UAE</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field label="State / City" required error={errors.stateCity?.message}>
          <Input placeholder="e.g. Karnataka, Bangalore / New York, USA" {...register("stateCity")} />
        </Field>

        <Field label="Office Location" required error={errors.officeLocation?.message}>
          <Input placeholder="e.g. Head Office – Bangalore, Branch – Mumbai" {...register("officeLocation")} />
        </Field>
      </FieldGroup>
    </div>
  );
}
