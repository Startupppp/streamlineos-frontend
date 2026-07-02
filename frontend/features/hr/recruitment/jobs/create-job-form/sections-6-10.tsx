"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { INTERVIEW_ROUND_OPTIONS } from "./schema";
import { FieldError, SectionTitle } from "./sections-1-5";
import type { SectionProps } from "./sections-1-5";
import { cn } from "@/lib/utils";
import { useHiringFlows } from "@/hooks/api/hr/recruitment";
import {
  FileText, Users, Settings, Eye, Zap,
} from "lucide-react";

const NO_HIRING_FLOW = "none";

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

function ToggleRow({ label, description, children }: {
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

export function Section6({ form }: SectionProps) {
  const { register, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Job Description" subtitle="Detailed description of the role" icon={FileText} />
      <div className="grid gap-4">
        <Field label="Overview" required error={errors.overview?.message}>
          <Textarea rows={4} placeholder="e.g. We are looking for a skilled developer to join our team and help build world-class products..." {...register("overview")} />
        </Field>

        <Field label="Responsibilities" required error={errors.responsibilities?.message}>
          <Textarea rows={4} placeholder="e.g. Build and maintain UI components, integrate APIs, review code..." {...register("responsibilities")} />
        </Field>

        <Field label="Requirements" required error={errors.jobRequirements?.message}>
          <Textarea rows={4} placeholder="e.g. 3+ years experience in React, proficiency in TypeScript..." {...register("jobRequirements")} />
        </Field>

        <Field label="Benefits">
          <Textarea rows={3} placeholder="e.g. Health Insurance, Flexible Work Hours, Annual Leave, Stock Options..." {...register("benefits")} />
        </Field>
      </div>
    </div>
  );
}

export function Section7({ form }: SectionProps) {
  const { register, watch, setValue, control, formState: { errors } } = form;
  const selectedRounds = watch("interviewRounds") ?? [];
  const { data: hiringFlows } = useHiringFlows();

  const handleRoundToggle = (round: string, checked: boolean) => {
    const next = checked
      ? [...selectedRounds, round]
      : selectedRounds.filter((r) => r !== round);
    setValue("interviewRounds", next, { shouldValidate: true });
  };

  return (
    <div>
      <SectionTitle title="Hiring Workflow" subtitle="Define the hiring process for this role" icon={Users} />
      <div className="grid gap-4">
        <Field label="Hiring Manager" required error={errors.hiringManager?.message}>
          <Input placeholder="e.g. John Doe, HR Manager" {...register("hiringManager")} />
        </Field>

        <Field label="Hiring Flow Template" hint="Optional — assign a reusable interview workflow">
          <Controller
            name="hiringFlowId"
            control={control}
            render={({ field }) => {
              function handleHiringFlowChange(value: string) {
                field.onChange(value === NO_HIRING_FLOW ? "" : value);
              }
              return (
              <Select value={field.value ? field.value : NO_HIRING_FLOW} onValueChange={handleHiringFlowChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a hiring flow (optional)" />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value={NO_HIRING_FLOW}>None</SelectItem>
                  {(hiringFlows ?? []).map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}{f.isDefault ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              );
            }}
          />
        </Field>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground/80">
            Interview Rounds<span className="text-rose-500 ml-0.5">*</span>
          </Label>
          <p className="text-[10px] text-muted-foreground">Select at least one round</p>
          <div className="grid sm:grid-cols-2 gap-2 mt-1">
            {INTERVIEW_ROUND_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors duration-200",
                  selectedRounds.includes(value)
                    ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <Checkbox
                  checked={selectedRounds.includes(value)}
                  onCheckedChange={(checked) => handleRoundToggle(value, !!checked)}
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
          <FieldError message={errors.interviewRounds?.message} />
        </div>

        <Field label="Question Bank Mapping" required error={errors.questionBankMapping?.message}>
          <Input placeholder="e.g. React JS Questions, HR Screening Questions" {...register("questionBankMapping")} />
        </Field>
      </div>
    </div>
  );
}

export function Section8({ form }: SectionProps) {
  const { register, control } = form;
  return (
    <div>
      <SectionTitle title="Application Settings" subtitle="Configure what applicants need to submit" icon={Settings} />
      <div className="grid gap-3">
        <ToggleRow
          label="Resume Required"
          description="Applicants must upload a resume to apply"
        >
          <Controller name="resumeRequired" control={control} render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )} />
        </ToggleRow>

        <ToggleRow
          label="Cover Letter Required"
          description="Applicants must submit a cover letter"
        >
          <Controller name="coverLetterRequired" control={control} render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )} />
        </ToggleRow>

        <Field label="Custom Fields">
          <Input placeholder="e.g. Portfolio Link, LinkedIn URL, Notice Period" {...register("customFields")} />
        </Field>
      </div>
    </div>
  );
}

export function Section9({ form }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Job Status & Visibility" subtitle="Control the posting's reach and status" icon={Eye} />
      <div className="grid gap-4">
        <Field label="Status" required error={errors.status?.message}>
          <Controller name="status" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="OPEN">Published</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </Field>

        <Field label="Visibility" required error={errors.visibility?.message}>
          <Controller name="visibility" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="INTERNAL">Internal Only</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </Field>

        <Field label="Application Deadline">
          <Input type="date" {...register("applicationDeadline")} />
        </Field>
      </div>
    </div>
  );
}

export function Section10({ form }: SectionProps) {
  const { control, formState: { errors } } = form;

  const priorityOptions = [
    { value: "LOW", label: "Low", activeClass: "bg-slate-600 hover:bg-slate-700 text-white border-slate-600" },
    { value: "MEDIUM", label: "Medium", activeClass: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" },
    { value: "HIGH", label: "High", activeClass: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" },
    { value: "URGENT", label: "Urgent", activeClass: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600" },
  ] as const;

  return (
    <div>
      <SectionTitle title="Additional Settings" subtitle="Priority and workflow preferences" icon={Zap} />
      <div className="grid gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground/80">
            Priority<span className="text-rose-500 ml-0.5">*</span>
          </Label>
          <Controller name="priority" control={control} render={({ field }) => (
            <div className="flex gap-2">
              {priorityOptions.map(({ value, label, activeClass }) => (
                <Button
                  key={value}
                  type="button"
                  variant={field.value === value ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1 h-9 text-xs font-semibold transition-colors duration-200",
                    field.value === value && activeClass
                  )}
                  onClick={() => field.onChange(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )} />
          <FieldError message={errors.priority?.message} />
        </div>

        <ToggleRow
          label="Referral Enabled"
          description="Allow employees to refer candidates for this role"
        >
          <Controller name="referralEnabled" control={control} render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )} />
        </ToggleRow>

        <ToggleRow
          label="Approval Required"
          description="Require manager approval before the job is published"
        >
          <Controller name="approvalRequired" control={control} render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )} />
        </ToggleRow>
      </div>
    </div>
  );
}
