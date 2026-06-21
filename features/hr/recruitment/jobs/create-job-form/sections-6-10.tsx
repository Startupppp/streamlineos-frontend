"use client";

import { UseFormReturn, Controller } from "react-hook-form";
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
import type { CreateJobFormValues } from "./schema";
import type { SectionProps } from "./sections-1-5";
import { cn } from "@/lib/utils";

export function Section6({ form }: SectionProps) {
  const { register, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Job Description" subtitle="Detailed description of the role" />
      <div className="grid gap-4">
        <div>
          <Label className="text-xs font-medium">Overview <span className="text-destructive">*</span></Label>
          <Textarea className="mt-1" rows={4} placeholder="e.g. We are looking for a skilled developer..." {...register("overview")} />
          <FieldError message={errors.overview?.message} />
        </div>
        <div>
          <Label className="text-xs font-medium">Responsibilities <span className="text-destructive">*</span></Label>
          <Textarea className="mt-1" rows={4} placeholder="e.g. Build UI components, API integration..." {...register("responsibilities")} />
          <FieldError message={errors.responsibilities?.message} />
        </div>
        <div>
          <Label className="text-xs font-medium">Requirements <span className="text-destructive">*</span></Label>
          <Textarea className="mt-1" rows={4} placeholder="e.g. 3+ years experience in React..." {...register("jobRequirements")} />
          <FieldError message={errors.jobRequirements?.message} />
        </div>
        <div>
          <Label className="text-xs font-medium">Benefits</Label>
          <Textarea className="mt-1" rows={3} placeholder="e.g. Health Insurance, Work From Home, Paid Leave..." {...register("benefits")} />
        </div>
      </div>
    </div>
  );
}

export function Section7({ form }: SectionProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const selectedRounds = watch("interviewRounds") ?? [];

  const handleRoundToggle = (round: string, checked: boolean) => {
    const next = checked
      ? [...selectedRounds, round]
      : selectedRounds.filter((r) => r !== round);
    setValue("interviewRounds", next, { shouldValidate: true });
  };

  return (
    <div>
      <SectionTitle title="Hiring Workflow" subtitle="Define the hiring process for this role" />
      <div className="grid gap-4">
        <div>
          <Label className="text-xs font-medium">Hiring Manager <span className="text-destructive">*</span></Label>
          <Input className="mt-1" placeholder="e.g. John Doe, HR Manager" {...register("hiringManager")} />
          <FieldError message={errors.hiringManager?.message} />
        </div>
        <div>
          <Label className="text-xs font-medium">Interview Rounds <span className="text-destructive">*</span></Label>
          <p className="text-[10px] text-muted-foreground mb-2">Select at least one round</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {INTERVIEW_ROUND_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedRounds.includes(value)}
                  onCheckedChange={(checked) => handleRoundToggle(value, !!checked)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
          <FieldError message={errors.interviewRounds?.message} />
        </div>
        <div>
          <Label className="text-xs font-medium">Question Bank Mapping <span className="text-destructive">*</span></Label>
          <Input className="mt-1" placeholder="e.g. React JS Questions, HR Screening Questions" {...register("questionBankMapping")} />
          <FieldError message={errors.questionBankMapping?.message} />
        </div>
      </div>
    </div>
  );
}

export function Section8({ form }: SectionProps) {
  const { register, control } = form;
  return (
    <div>
      <SectionTitle title="Application Settings" subtitle="Configure what applicants need to submit" />
      <div className="grid gap-4">
        <div className="flex items-center justify-between rounded-md border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Resume Required</p>
            <p className="text-xs text-muted-foreground">Applicants must upload a resume</p>
          </div>
          <Controller name="resumeRequired" control={control} render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )} />
        </div>
        <div className="flex items-center justify-between rounded-md border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Cover Letter Required</p>
            <p className="text-xs text-muted-foreground">Applicants must submit a cover letter</p>
          </div>
          <Controller name="coverLetterRequired" control={control} render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )} />
        </div>
        <div>
          <Label className="text-xs font-medium">Custom Fields</Label>
          <Input className="mt-1" placeholder="e.g. Portfolio Link, LinkedIn URL, Notice Period" {...register("customFields")} />
        </div>
      </div>
    </div>
  );
}

export function Section9({ form }: SectionProps) {
  const { register, control, formState: { errors } } = form;
  return (
    <div>
      <SectionTitle title="Job Status & Visibility" subtitle="Control the posting's reach and status" />
      <div className="grid gap-4">
        <div>
          <Label className="text-xs font-medium">Status <span className="text-destructive">*</span></Label>
          <Controller name="status" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="OPEN">Published</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          )} />
          <FieldError message={errors.status?.message} />
        </div>
        <div>
          <Label className="text-xs font-medium">Visibility <span className="text-destructive">*</span></Label>
          <Controller name="visibility" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="INTERNAL">Internal Only</SelectItem>
              </SelectContent>
            </Select>
          )} />
          <FieldError message={errors.visibility?.message} />
        </div>
        <div>
          <Label className="text-xs font-medium">Application Deadline</Label>
          <Input className="mt-1" type="date" placeholder="e.g. 30 Dec 2026" {...register("applicationDeadline")} />
        </div>
      </div>
    </div>
  );
}

export function Section10({ form }: SectionProps) {
  const { control, formState: { errors } } = form;
  const priorityOptions = [
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
  ] as const;

  return (
    <div>
      <SectionTitle title="Additional Settings" subtitle="Priority and workflow preferences" />
      <div className="grid gap-5">
        <div>
          <Label className="text-xs font-medium mb-2 block">Priority <span className="text-destructive">*</span></Label>
          <Controller name="priority" control={control} render={({ field }) => (
            <div className="flex gap-2">
              {priorityOptions.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={field.value === value ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1",
                    value === "URGENT" && field.value === value && "bg-destructive hover:bg-destructive/90 border-destructive"
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
        <div className="flex items-center justify-between rounded-md border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Referral Enabled</p>
            <p className="text-xs text-muted-foreground">Allow employees to refer candidates</p>
          </div>
          <Controller name="referralEnabled" control={control} render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )} />
        </div>
        <div className="flex items-center justify-between rounded-md border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Approval Required</p>
            <p className="text-xs text-muted-foreground">Require manager approval before publishing</p>
          </div>
          <Controller name="approvalRequired" control={control} render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )} />
        </div>
      </div>
    </div>
  );
}
