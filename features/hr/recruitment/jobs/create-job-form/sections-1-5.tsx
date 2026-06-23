"use client";

import { UseFormReturn, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChipInput } from "./chip-input";
import type { CreateJobFormValues } from "./schema";
import type { Department } from "@/types/hr";

export interface SectionProps {
  form: UseFormReturn<CreateJobFormValues>;
  departments?: Department[];
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

export function Section1({ form, departments }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Basic Job Details" subtitle="Core information about the position" />
      <div className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium">Job Title <span className="text-destructive">*</span></Label>
            <Input className="mt-1" placeholder="e.g. Software Engineer, HR Manager" {...register("title")} />
            <FieldError message={errors.title?.message} />
          </div>
          <div>
            <Label className="text-xs font-medium">Department <span className="text-destructive">*</span></Label>
            <Controller name="departmentId" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
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
            <FieldError message={errors.departmentId?.message} />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium">Role <span className="text-destructive">*</span></Label>
          <Input className="mt-1" placeholder="e.g. Frontend Developer, Recruiter, Accountant" {...register("role")} />
          <FieldError message={errors.role?.message} />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs font-medium">Job Type <span className="text-destructive">*</span></Label>
            <Controller name="jobType" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
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
            <FieldError message={errors.jobType?.message} />
          </div>
          <div>
            <Label className="text-xs font-medium">Work Mode <span className="text-destructive">*</span></Label>
            <Controller name="workMode" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="ONSITE">On-site</SelectItem>
                  <SelectItem value="REMOTE">Remote</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            )} />
            <FieldError message={errors.workMode?.message} />
          </div>
          <div>
            <Label className="text-xs font-medium">Number of Openings <span className="text-destructive">*</span></Label>
            <Input className="mt-1" type="number" min={1} placeholder="e.g. 1, 2, 5" {...register("openings", { valueAsNumber: true })} />
            <FieldError message={errors.openings?.message} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Section2({ form }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Location Details" subtitle="Where this role is based" />
      <div className="grid gap-4">
        <div>
          <Label className="text-xs font-medium">Country <span className="text-destructive">*</span></Label>
          <Controller name="country" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="e.g. India, USA, UK" /></SelectTrigger>
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
          <FieldError message={errors.country?.message} />
        </div>
        <div>
          <Label className="text-xs font-medium">State / City <span className="text-destructive">*</span></Label>
          <Input className="mt-1" placeholder="e.g. Karnataka, Bangalore / New York, USA" {...register("stateCity")} />
          <FieldError message={errors.stateCity?.message} />
        </div>
        <div>
          <Label className="text-xs font-medium">Office Location <span className="text-destructive">*</span></Label>
          <Input className="mt-1" placeholder="e.g. Head Office – Bangalore, Branch – Mumbai" {...register("officeLocation")} />
          <FieldError message={errors.officeLocation?.message} />
        </div>
      </div>
    </div>
  );
}

export function Section3({ form }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Compensation Details" subtitle="Salary range and pay structure" />
      <div className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium">Minimum Salary <span className="text-destructive">*</span></Label>
            <Input className="mt-1" inputMode="numeric" placeholder="e.g. 500000" {...register("salaryMin", { valueAsNumber: true })} />
            <FieldError message={errors.salaryMin?.message} />
          </div>
          <div>
            <Label className="text-xs font-medium">Maximum Salary <span className="text-destructive">*</span></Label>
            <Input className="mt-1" inputMode="numeric" placeholder="e.g. 1200000" {...register("salaryMax", { valueAsNumber: true })} />
            <FieldError message={errors.salaryMax?.message} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium">Currency <span className="text-destructive">*</span></Label>
            <Controller name="currency" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select currency" /></SelectTrigger>
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
            <FieldError message={errors.currency?.message} />
          </div>
          <div>
            <Label className="text-xs font-medium">Salary Type <span className="text-destructive">*</span></Label>
            <Controller name="salaryType" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="HOURLY">Hourly</SelectItem>
                </SelectContent>
              </Select>
            )} />
            <FieldError message={errors.salaryType?.message} />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium">Bonus / Incentive</Label>
          <Input className="mt-1" placeholder="e.g. Performance Bonus, Quarterly Incentive" {...register("bonus")} />
        </div>
      </div>
    </div>
  );
}

export function Section4({ form }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Experience & Education" subtitle="Qualifications and experience required" />
      <div className="grid gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium">Minimum Experience (years) <span className="text-destructive">*</span></Label>
            <Input className="mt-1" type="number" min={0} placeholder="e.g. 0, 1, 3, 5" {...register("minExperience", { valueAsNumber: true })} />
            <FieldError message={errors.minExperience?.message} />
          </div>
          <div>
            <Label className="text-xs font-medium">Maximum Experience (years)</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              placeholder="e.g. 2, 5, 10"
              {...register("maxExperience", {
                valueAsNumber: true,
                setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)),
              })}
            />
            <FieldError message={errors.maxExperience?.message} />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium">Education Level <span className="text-destructive">*</span></Label>
          <Controller name="educationLevel" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select level" /></SelectTrigger>
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
          <FieldError message={errors.educationLevel?.message} />
        </div>
      </div>
    </div>
  );
}

export function Section5({ form }: SectionProps) {
  const { control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Skills & Tags" subtitle="Required and preferred competencies" />
      <div className="grid gap-4">
        <div>
          <Label className="text-xs font-medium">Required Skills <span className="text-destructive">*</span></Label>
          <p className="text-[10px] text-muted-foreground mb-1">e.g. React, Node.js, Java, Excel — type and press Enter</p>
          <Controller name="requiredSkills" control={control} render={({ field }) => (
            <ChipInput value={field.value ?? []} onChange={field.onChange} placeholder="Type a skill and press Enter..." />
          )} />
          <FieldError message={errors.requiredSkills?.message} />
        </div>
        <div>
          <Label className="text-xs font-medium">Preferred Skills</Label>
          <p className="text-[10px] text-muted-foreground mb-1">e.g. AWS, Docker, TypeScript</p>
          <Controller name="preferredSkills" control={control} render={({ field }) => (
            <ChipInput value={field.value ?? []} onChange={field.onChange} placeholder="Type a skill and press Enter..." />
          )} />
        </div>
        <div>
          <Label className="text-xs font-medium">Tags</Label>
          <p className="text-[10px] text-muted-foreground mb-1">e.g. Urgent, Remote, Senior, Leadership, Backend</p>
          <Controller name="tags" control={control} render={({ field }) => (
            <ChipInput value={field.value ?? []} onChange={field.onChange} placeholder="Type a tag and press Enter..." />
          )} />
        </div>
      </div>
    </div>
  );
}
