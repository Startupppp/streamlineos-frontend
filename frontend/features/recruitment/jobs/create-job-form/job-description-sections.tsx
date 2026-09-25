"use client";

import { SectionTitle, Field, type SectionProps } from "./job-basics-sections";
import { FileText } from "lucide-react";
import { WordLimitedTextarea } from "./word-limited-textarea";
import { JOB_DESCRIPTION_LIMITS } from "./job-description-limits";

export function Section6({ form }: SectionProps) {
  const { control, formState: { errors } } = form;

  return (
    <div>
      <SectionTitle title="Job Description" subtitle="Detailed description of the role" icon={FileText} />
      <div className="grid gap-4">
        <Field
          label="Overview"
          required
          hint={`${JOB_DESCRIPTION_LIMITS.overview.minWords}–${JOB_DESCRIPTION_LIMITS.overview.maxWords} words`}
          error={errors.overview?.message}
        >
          <WordLimitedTextarea
            control={control}
            name="overview"
            maxWords={JOB_DESCRIPTION_LIMITS.overview.maxWords}
            placeholder="e.g. We are looking for a skilled developer to join our team and help build world-class products..."
          />
        </Field>

        <Field
          label="Responsibilities"
          required
          hint={`${JOB_DESCRIPTION_LIMITS.responsibilities.minWords}–${JOB_DESCRIPTION_LIMITS.responsibilities.maxWords} words`}
          error={errors.responsibilities?.message}
        >
          <WordLimitedTextarea
            control={control}
            name="responsibilities"
            maxWords={JOB_DESCRIPTION_LIMITS.responsibilities.maxWords}
            placeholder="e.g. Build and maintain UI components, integrate APIs, review code..."
          />
        </Field>

        <Field
          label="Requirements"
          required
          hint={`${JOB_DESCRIPTION_LIMITS.jobRequirements.minWords}–${JOB_DESCRIPTION_LIMITS.jobRequirements.maxWords} words`}
          error={errors.jobRequirements?.message}
        >
          <WordLimitedTextarea
            control={control}
            name="jobRequirements"
            maxWords={JOB_DESCRIPTION_LIMITS.jobRequirements.maxWords}
            placeholder="e.g. 3+ years experience in React, proficiency in TypeScript..."
          />
        </Field>

        <Field
          label="Benefits"
          hint={`Up to ${JOB_DESCRIPTION_LIMITS.benefits.maxWords} words`}
          error={errors.benefits?.message}
        >
          <WordLimitedTextarea
            control={control}
            name="benefits"
            maxWords={JOB_DESCRIPTION_LIMITS.benefits.maxWords}
            rows={3}
            placeholder="e.g. Health Insurance, Flexible Work Hours, Annual Leave, Stock Options..."
          />
        </Field>
      </div>
    </div>
  );
}
