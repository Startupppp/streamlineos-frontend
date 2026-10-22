"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  useApplyJobTemplate,
  useJobTemplates,
  type JobTemplateDraft,
} from "@/hooks/api/hr/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";
import { Field } from "./job-form-field";
import { NO_JOB_TEMPLATE, type CreateJobFormValues } from "./schema";
import { templateDraftToFormValues } from "./template-to-form";

interface JobTemplatePickerProps {
  form: UseFormReturn<CreateJobFormValues>;
}

function isAuthored(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function JobTemplatePicker({ form }: JobTemplatePickerProps) {
  const { control, getValues, reset, setValue } = form;
  const templates = useJobTemplates();
  const applyTemplate = useApplyJobTemplate();

  function currentDraft(): JobTemplateDraft {
    const values = getValues();
    const draft: JobTemplateDraft = {};
    if (isAuthored(values.title)) draft.title = values.title;
    if (isAuthored(values.jobType)) draft.type = values.jobType;
    if (isAuthored(values.benefits)) draft.benefits = values.benefits;
    if (isAuthored(values.jobRequirements)) draft.requirements = values.jobRequirements;
    if (isAuthored(values.overview)) draft.description = values.overview;
    if (isAuthored(values.screeningQuestions)) draft.screeningQuestions = values.screeningQuestions;
    return draft;
  }

  function fillGaps(mapped: Partial<CreateJobFormValues>): number {
    const current = getValues();
    const next: CreateJobFormValues = { ...current };
    let filled = 0;

    const take = <K extends keyof CreateJobFormValues>(key: K): void => {
      const value = mapped[key];
      if (value === undefined || isAuthored(current[key])) return;
      next[key] = value;
      filled += 1;
    };

    take("title");
    take("jobType");
    take("minExperience");
    take("maxExperience");
    take("educationLevel");
    take("jobRequirements");
    take("tags");
    take("benefits");
    take("screeningQuestions");
    take("overview");
    take("responsibilities");
    take("workMode");
    take("requiredSkills");
    take("preferredSkills");
    take("hiringManager");
    take("interviewRounds");

    if (filled > 0) reset(next, { keepDirty: true, keepErrors: true, keepTouched: true });
    return filled;
  }

  function handleTemplateChange(value: string) {
    setValue("jobTemplateId", value);
    if (value === NO_JOB_TEMPLATE) return;

    const jobTemplateId = Number(value);
    if (!Number.isFinite(jobTemplateId)) return;

    applyTemplate.mutate(
      { jobTemplateId, draft: currentDraft() },
      {
        onSuccess: (applied) => {
          const filled = fillGaps(templateDraftToFormValues(applied.draft));
          toast.success(
            filled === 0
              ? `${applied.jobTemplateName} added nothing — every field it fills is already written`
              : `Filled ${filled} empty ${filled === 1 ? "field" : "fields"} from ${applied.jobTemplateName}`,
          );
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (templates.access.denied) return null;

  const options = templates.data ?? [];

  return (
    <Field
      label="Start from Template"
      hint="Optional — fills the fields you have left empty and leaves everything you have written alone"
    >
      <Controller
        name="jobTemplateId"
        control={control}
        render={({ field }) => (
          <Select
            value={field.value ?? NO_JOB_TEMPLATE}
            onValueChange={handleTemplateChange}
            disabled={applyTemplate.isPending}
          >
            <SelectTrigger aria-label="Start from template">
              <SelectValue placeholder="Select a template (optional)" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value={NO_JOB_TEMPLATE}>Start from scratch</SelectItem>
              {options.map((template) => (
                <SelectItem key={template.id} value={String(template.id)}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}
