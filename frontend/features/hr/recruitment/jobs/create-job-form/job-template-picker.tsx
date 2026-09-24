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
import { Field } from "./job-basics-sections";
import { NO_JOB_TEMPLATE, type CreateJobFormValues } from "./schema";
import { templateDraftToFormValues } from "./template-to-form";

interface JobTemplatePickerProps {
  form: UseFormReturn<CreateJobFormValues>;
}

/**
 * A value the recruiter has authored, as opposed to one that is merely present.
 *
 * The form seeds several fields with defaults, and an empty array or an empty
 * string is the shape "nothing typed here yet" takes in this wizard. Treating
 * either as authored would make the template fill nothing at all on a fresh
 * form, which is the only moment anyone uses it.
 */
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

  /**
   * Hands the server the posting-shaped fields a template can speak to, and
   * nothing else. The server owns the merge so the picker cannot drift from it;
   * sending the lifecycle fields as well would only invite a future change to
   * start copying a status or a deadline forward.
   */
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

  /**
   * Writes a mapped value only where the form is still empty.
   *
   * The server already refused to overrule anything the recruiter sent, but it
   * sees one `description` blob where the wizard has eight separate inputs — so
   * the per-field guard is what protects the fields the server could not see.
   * The two rules agree by construction: both say "the recruiter wins".
   *
   * One `reset` rather than a loop of `setValue`: `setValue`'s value type is
   * resolved from its path, which a `keyof` loop cannot narrow without a type
   * assertion. Building the whole next value keeps it checked.
   */
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

  /**
   * Hidden rather than disabled when the read is denied. A recruiter without
   * `hr:requisitions:view` has no library to pick from, and an always-empty
   * dropdown reads as a broken feature rather than one they cannot use.
   */
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
