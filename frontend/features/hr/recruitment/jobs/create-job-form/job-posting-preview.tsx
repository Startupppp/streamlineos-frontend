"use client";

import { useWatch, type Control } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { MapPin, Briefcase, Wallet, GraduationCap, Clock } from "lucide-react";
import type { CreateJobFormValues } from "./schema";
import type { Department } from "@/types/hr";

const WORK_MODE_LABELS: Record<string, string> = {
  ONSITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
  TEMPORARY: "Temporary",
  CONSULTANT: "Consultant",
  APPRENTICESHIP: "Apprenticeship",
  COMMISSION_BASED: "Commission-based",
};

function formatCompensation(values: CreateJobFormValues): string | null {
  if (!values.salaryMin && !values.salaryMax) return null;
  const currency = values.currency ?? "";
  const suffix = values.salaryType ? ` / ${values.salaryType.toLowerCase()}` : "";
  if (values.salaryMin && values.salaryMax) {
    return `${currency} ${values.salaryMin.toLocaleString()} – ${values.salaryMax.toLocaleString()}${suffix}`;
  }
  return `${currency} ${(values.salaryMin ?? values.salaryMax)?.toLocaleString()}${suffix}`;
}

interface JobPostingPreviewProps {
  control: Control<CreateJobFormValues>;
  departments?: Department[];
}

export function JobPostingPreview({ control, departments }: JobPostingPreviewProps) {
  const values = useWatch({ control });
  const department = departments?.find((d) => String(d.id) === values.departmentId);
  const compensation = formatCompensation(values as CreateJobFormValues);
  const location = [values.officeLocation, values.stateCity, values.country].filter(Boolean).join(", ");

  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 bg-muted/30">
        <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
          Careers site preview
        </p>
      </div>
      <div className="p-6 space-y-5">
        <div>
          <TruncatedText
            text={values.title || "Untitled role"}
            lines={2}
            className="text-lg font-semibold text-foreground leading-snug"
          />
          <TruncatedText
            text={department?.name ?? "Department not set"}
            className="text-sm text-muted-foreground mt-0.5"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {values.jobType && <Badge variant="secondary">{JOB_TYPE_LABELS[values.jobType] ?? values.jobType}</Badge>}
          {values.workMode && <Badge variant="outline">{WORK_MODE_LABELS[values.workMode] ?? values.workMode}</Badge>}
          {values.priority && <Badge variant="outline">{values.priority}</Badge>}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          {location && (
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <TruncatedText text={location} className="min-w-0 flex-1" />
            </div>
          )}
          {compensation && (
            <div className="flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              <span>{compensation}</span>
            </div>
          )}
          {values.educationLevel && (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              <span>
                {values.minExperience ?? 0}
                {values.maxExperience != null ? `–${values.maxExperience}` : "+"} years · {values.educationLevel}
              </span>
            </div>
          )}
          {values.openings && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <span>{values.openings} opening{values.openings > 1 ? "s" : ""}</span>
            </div>
          )}
          {values.applicationDeadline && (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Apply by {values.applicationDeadline}</span>
            </div>
          )}
        </div>

        {(values.requiredSkills?.length || values.preferredSkills?.length) ? (
          <div className="flex flex-wrap gap-1.5">
            {values.requiredSkills?.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-micro">
                {skill}
              </Badge>
            ))}
            {values.preferredSkills?.map((skill) => (
              <Badge key={skill} variant="outline" className="text-micro">
                {skill}
              </Badge>
            ))}
          </div>
        ) : null}

        {values.overview && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-1">Overview</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{values.overview}</p>
          </div>
        )}

        {values.responsibilities && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-1">Responsibilities</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{values.responsibilities}</p>
          </div>
        )}

        {values.jobRequirements && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-1">Requirements</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{values.jobRequirements}</p>
          </div>
        )}

        {values.benefits && (
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-1">Benefits</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{values.benefits}</p>
          </div>
        )}

        {!values.title && !values.overview && (
          <p className="text-xs text-muted-foreground italic">
            Fill in the form to see how this posting will look to candidates.
          </p>
        )}
      </div>
    </div>
  );
}
