"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChipInput } from "./chip-input";
import { SectionTitle, FieldGroup, Field, type SectionProps } from "./job-basics-sections";
import { Sparkles, Briefcase, Tag } from "lucide-react";

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
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
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
              )}
            />
          </Field>
          <Field label="Salary Type" required error={errors.salaryType?.message}>
            <Controller
              name="salaryType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                    <SelectItem value="HOURLY">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
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
          <Controller
            name="educationLevel"
            control={control}
            render={({ field }) => (
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
            )}
          />
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
          <Controller
            name="requiredSkills"
            control={control}
            render={({ field }) => (
              <ChipInput value={field.value ?? []} onChange={field.onChange} placeholder="e.g. React, Node.js, Java…" />
            )}
          />
        </Field>

        <Field label="Preferred Skills" hint="e.g. AWS, Docker, TypeScript">
          <Controller
            name="preferredSkills"
            control={control}
            render={({ field }) => (
              <ChipInput value={field.value ?? []} onChange={field.onChange} placeholder="e.g. AWS, Docker, TypeScript…" />
            )}
          />
        </Field>

        <Field label="Tags" hint="e.g. Urgent, Remote, Senior, Leadership, Backend">
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <ChipInput value={field.value ?? []} onChange={field.onChange} placeholder="e.g. Urgent, Senior…" />
            )}
          />
        </Field>
      </FieldGroup>
    </div>
  );
}
