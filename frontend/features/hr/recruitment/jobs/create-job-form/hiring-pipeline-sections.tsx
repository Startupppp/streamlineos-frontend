"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { INTERVIEW_ROUND_OPTIONS, NO_HIRING_FLOW, SCREENING_QUESTION_TYPES, type ScreeningQuestionValues } from "./schema";
import { SectionTitle, Field, FieldError, ToggleRow, type SectionProps } from "./job-basics-sections";
import { cn } from "@/lib/utils";
import { useHiringFlows } from "@/hooks/api/hr/recruitment";
import { Users, Settings, Plus, Trash2 } from "lucide-react";

const SCREENING_QUESTION_TYPE_LABELS: Record<(typeof SCREENING_QUESTION_TYPES)[number], string> = {
  TEXT: "Text answer",
  YES_NO: "Yes / No",
  SINGLE_SELECT: "Single select",
  NUMBER: "Number",
};

function newScreeningQuestion(): ScreeningQuestionValues {
  return {
    id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    question: "",
    type: "TEXT",
    required: true,
    knockout: false,
  };
}

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
                    ? "border-primary/40 bg-primary/5"
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
  const { register, control, watch, setValue } = form;
  const questions = watch("screeningQuestions") ?? [];

  function handleAddQuestion() {
    setValue("screeningQuestions", [...questions, newScreeningQuestion()], { shouldValidate: true });
  }

  function handleRemoveQuestion(id: string) {
    setValue("screeningQuestions", questions.filter((q) => q.id !== id), { shouldValidate: true });
  }

  function handleUpdateQuestion(id: string, patch: Partial<ScreeningQuestionValues>) {
    setValue(
      "screeningQuestions",
      questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
      { shouldValidate: true },
    );
  }

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

        <div className="space-y-1.5 mt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground/80">Screening Questions</Label>
            <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleAddQuestion}>
              <Plus className="h-3 w-3" />
              Add question
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Shown to applicants on the public apply form. Knockout questions flag the application for review — they
            never auto-reject a candidate.
          </p>

          {questions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-3">No screening questions added.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground mt-2 shrink-0">{idx + 1}.</span>
                    <Input
                      placeholder="e.g. Do you have a valid work visa?"
                      value={q.question}
                      onChange={(e) => handleUpdateQuestion(q.id, { question: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveQuestion(q.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pl-6">
                    <Select value={q.type} onValueChange={(v) => handleUpdateQuestion(q.id, { type: v as ScreeningQuestionValues["type"] })}>
                      <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCREENING_QUESTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{SCREENING_QUESTION_TYPE_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={q.required} onCheckedChange={(c) => handleUpdateQuestion(q.id, { required: !!c })} />
                      Required
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={q.knockout} onCheckedChange={(c) => handleUpdateQuestion(q.id, { knockout: !!c })} />
                      Knockout question
                    </label>
                    {q.knockout && q.type === "YES_NO" && (
                      <Select value={q.knockoutAnswer ?? "Yes"} onValueChange={(v) => handleUpdateQuestion(q.id, { knockoutAnswer: v })}>
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue placeholder="Disqualifying answer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Disqualify if &ldquo;Yes&rdquo;</SelectItem>
                          <SelectItem value="No">Disqualify if &ldquo;No&rdquo;</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
