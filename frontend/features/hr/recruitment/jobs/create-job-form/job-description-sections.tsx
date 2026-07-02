"use client";

import { Textarea } from "@/components/ui/textarea";
import { SectionTitle, Field, type SectionProps } from "./job-basics-sections";
import { FileText } from "lucide-react";

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
