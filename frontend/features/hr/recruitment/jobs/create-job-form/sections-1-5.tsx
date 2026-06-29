"use client";

import { UseFormReturn, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { ChipInput } from "./chip-input";
import type { CreateJobFormValues } from "./schema";
import type { Department } from "@/types/hr";
import { useBranches } from "@/hooks/api";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Briefcase, MapPin, Tag, Sparkles,
} from "lucide-react";

export interface SectionProps {
  form: UseFormReturn<CreateJobFormValues>;
  departments?: Department[];
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">{message}</p>;
}

export function SectionTitle({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="mb-5 pb-4 border-b border-border">
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className={cn("text-xs text-muted-foreground", Icon && "ml-9")}>{subtitle}</p>
    </div>
  );
}

function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}

function Field({ label, required, hint, error, children }: {
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
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </Label>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {children}
      {error && <FieldError message={error} />}
    </div>
  );
}

export function Section1({ form, departments }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Basic Job Details" subtitle="Core information about the position" icon={Briefcase} />
      <FieldGroup>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Job Title" required error={errors.title?.message}>
            <Input placeholder="e.g. Software Engineer, HR Manager" {...register("title")} />
          </Field>
          <Field label="Department" required error={errors.departmentId?.message}>
            <Controller name="departmentId" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
            )} />
          </Field>
        </div>

        <Field label="Role" required error={errors.role?.message}>
          <Input placeholder="e.g. Frontend Developer, Recruiter, Accountant" {...register("role")} />
        </Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Job Type" required error={errors.jobType?.message}>
            <Controller name="jobType" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
            )} />
          </Field>

          <Field label="Work Mode" required error={errors.workMode?.message}>
            <Controller name="workMode" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="ONSITE">On-site</SelectItem>
                  <SelectItem value="REMOTE">Remote</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            )} />
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
  const { data: branches } = useBranches();
  const branchOptions = useMemo<ComboboxOption[]>(() =>
    (branches ?? [])
      .filter((b) => b.status === "ACTIVE")
      .map((b) => ({
        value: String(b.id),
        label: b.name,
        sublabel: [b.city, b.state, b.country].filter(Boolean).join(", "),
      })),
    [branches],
  );

  const handleBranchSelect = (branchId: string) => {
    const branch = (branches ?? []).find((b) => String(b.id) === branchId);
    if (!branch) return;
    if (branch.country) setValue("country", branch.country, { shouldValidate: true });
    const cityState = [branch.city, branch.state].filter(Boolean).join(", ");
    if (cityState) setValue("stateCity", cityState, { shouldValidate: true });
    setValue("officeLocation", branch.name, { shouldValidate: true });
  };

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
          <Controller name="country" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="e.g. India, USA, UK" /></SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
          )} />
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

export function Section3({ form }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Compensation Details" subtitle="Salary range and pay structure" icon={Sparkles} />
      <FieldGroup>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Minimum Salary" required error={errors.salaryMin?.message}>
            <Input inputMode="numeric" placeholder="e.g. 500000" {...register("salaryMin", { valueAsNumber: true })} />
          </Field>
          <Field label="Maximum Salary" required error={errors.salaryMax?.message}>
            <Input inputMode="numeric" placeholder="e.g. 1200000" {...register("salaryMax", { valueAsNumber: true })} />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Currency" required error={errors.currency?.message}>
            <Controller name="currency" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="SGD">SGD</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </Field>
          <Field label="Salary Type" required error={errors.salaryType?.message}>
            <Controller name="salaryType" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="HOURLY">Hourly</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </Field>
        </div>

        <Field label="Bonus / Incentive">
          <Input placeholder="e.g. Performance Bonus, Quarterly Incentive" {...register("bonus")} />
        </Field>
      </FieldGroup>
    </div>
  );
}

export function Section4({ form }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Experience & Education" subtitle="Qualifications and experience required" icon={Briefcase} />
      <FieldGroup>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Min. Experience (years)" required error={errors.minExperience?.message}>
            <Input type="number" min={0} placeholder="e.g. 0, 1, 3, 5" {...register("minExperience", { valueAsNumber: true })} />
          </Field>
          <Field label="Max. Experience (years)" error={errors.maxExperience?.message}>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 2, 5, 10"
              {...register("maxExperience", {
                valueAsNumber: true,
                setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
          </Field>
        </div>

        <Field label="Education Level" required error={errors.educationLevel?.message}>
          <Controller name="educationLevel" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                <SelectItem value="DIPLOMA">Diploma</SelectItem>
                <SelectItem value="BACHELORS">Bachelor&apos;s Degree</SelectItem>
                <SelectItem value="MASTERS">Master&apos;s Degree</SelectItem>
                <SelectItem value="PHD">PhD</SelectItem>
                <SelectItem value="ANY">Any</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </Field>
      </FieldGroup>
    </div>
  );
}

export function Section5({ form }: SectionProps) {
  const { control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Skills & Tags" subtitle="Required and preferred competencies" icon={Tag} />
      <FieldGroup>
        <Field
          label="Required Skills"
          required
          hint="Type a skill and press Enter or comma to add"
          error={errors.requiredSkills?.message}
        >
          <Controller name="requiredSkills" control={control} render={({ field }) => (
            <ChipInput value={field.value ?? []} onChange={field.onChange} placeholder="e.g. React, Node.js, Java…" />
          )} />
        </Field>

        <Field label="Preferred Skills" hint="e.g. AWS, Docker, TypeScript">
          <Controller name="preferredSkills" control={control} render={({ field }) => (
            <ChipInput value={field.value ?? []} onChange={field.onChange} placeholder="e.g. AWS, Docker, TypeScript…" />
          )} />
        </Field>

        <Field label="Tags" hint="e.g. Urgent, Remote, Senior, Leadership, Backend">
          <Controller name="tags" control={control} render={({ field }) => (
            <ChipInput value={field.value ?? []} onChange={field.onChange} placeholder="e.g. Urgent, Senior…" />
          )} />
        </Field>
      </FieldGroup>
    </div>
  );
}
