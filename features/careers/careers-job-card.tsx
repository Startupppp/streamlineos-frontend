import Link from "next/link";
import {
  MapPin,
  Clock,
  Briefcase,
  Building2,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { jobPostingPath } from "@/lib/careers/job-slug";
import type { PublicJobPosting } from "@/server/queries/public";

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
};

type CareersJobCardProps = {
  job: PublicJobPosting;
  departmentName?: string | null;
};

export function CareersJobCard({ job, departmentName }: CareersJobCardProps) {
  const typeLabel = job.type ? (JOB_TYPE_LABELS[job.type] ?? job.type) : null;
  const hasSalary = job.salaryMin !== null || job.salaryMax !== null;

  const salaryLabel =
    hasSalary &&
    (job.salaryMin && job.salaryMax
      ? `₹${Number(job.salaryMin).toLocaleString("en-IN")} – ₹${Number(job.salaryMax).toLocaleString("en-IN")}`
      : job.salaryMin
        ? `From ₹${Number(job.salaryMin).toLocaleString("en-IN")}`
        : `Up to ₹${Number(job.salaryMax).toLocaleString("en-IN")}`);

  return (
    <Link href={jobPostingPath(job.id, job.title)} className="block group">
      <article className="relative overflow-hidden rounded-xl border bg-card p-5 sm:p-6 shadow-soft transition-all duration-200 hover:border-primary/40 hover:shadow-gold glow-gold">
        <div
          className="absolute left-0 top-0 bottom-0 w-1 bg-primary/0 group-hover:bg-primary transition-colors duration-200 rounded-l-xl"
          aria-hidden
        />

        <div className="flex items-start justify-between gap-4 pl-2">
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors">
                {job.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {departmentName && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    {departmentName}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    {job.location}
                  </span>
                )}
                {typeLabel && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    {typeLabel}
                  </span>
                )}
                {job.experience && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    {job.experience}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {typeLabel && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium">
                  {typeLabel}
                </span>
              )}
              {salaryLabel && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {salaryLabel}
                </span>
              )}
              {job.openings && job.openings > 1 && (
                <span className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {job.openings} openings
                </span>
              )}
            </div>

            {job.applicationDeadline && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/60">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                Apply by{" "}
                {new Date(job.applicationDeadline).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary transition-all">
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </article>
    </Link>
  );
}
