"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { INTERVIEW_ROUND_OPTIONS, NO_HIRING_FLOW } from "./schema";
import { SectionTitle, Field, FieldError, ToggleRow, type SectionProps } from "./job-basics-sections";
import { cn } from "@/lib/utils";
import { useHiringFlows } from "@/hooks/api/hr/recruitment";
import { Users, Settings } from "lucide-react";

export function Section7({ form }: SectionProps) {
  const { register, watch, setValue, control, formState: { errors } } = form;
  const selectedRounds = watch("interviewRounds") ?? [];
  const { data: hiringFlows } = useHiringFlows();

  function handleRoundToggle(round: string, checked: boolean) {
    const next = checked
      ? [...selectedRounds, round]
      : selectedRounds.filter((r) => r !== round);
    setValue("interviewRounds", next, { shouldValidate: true });
  }

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
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
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
          <Controller
            name="resumeRequired"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </ToggleRow>

        <ToggleRow
          label="Cover Letter Required"
          description="Applicants must submit a cover letter"
        >
          <Controller
            name="coverLetterRequired"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </ToggleRow>

        <Field label="Custom Fields">
          <Input placeholder="e.g. Portfolio Link, LinkedIn URL, Notice Period" {...register("customFields")} />
        </Field>
      </div>
    </div>
  );
}
