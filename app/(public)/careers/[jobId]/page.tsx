import {
  getJobPostingMetadata,
  getJobPostingDetail,
  getDepartmentName,
} from "@/server/queries/public";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Clock, Briefcase, Building2, Users, CalendarDays, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 300;

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
};

type Props = {
  params: Promise<{ jobId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jobId } = await params;
  const id = Number(jobId);
  if (isNaN(id)) return { title: "Job Not Found" };

  const job = await getJobPostingMetadata(id);
  if (!job) return { title: "Job Not Found" };
  return {
    title: job.title,
    description: `${job.title}${job.location ? ` · ${job.location}` : ""} — Apply at Vaivamm Capital`,
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { jobId } = await params;
  const id = Number(jobId);
  if (isNaN(id)) notFound();

  const job = await getJobPostingDetail(id);
  if (!job) notFound();

  const deptName = job.departmentId ? await getDepartmentName(job.departmentId) : null;

  const typeLabel = job.type ? (JOB_TYPE_LABELS[job.type] ?? job.type) : null;
  const hasSalary = job.salaryMin !== null || job.salaryMax !== null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">Vaivamm Capital</span>
          <Link
            href="/careers"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All jobs
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{job.title}</h1>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {deptName && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 shrink-0" />
                    {deptName}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {job.location}
                  </span>
                )}
                {typeLabel && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" />
                    {typeLabel}
                  </span>
                )}
                {job.experience && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 shrink-0" />
                    {job.experience}
                  </span>
                )}
              </div>
            </div>

            {job.description && (
              <section>
                <h2 className="text-base font-semibold mb-3">About this role</h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </div>
              </section>
            )}

            {job.requirements && (
              <section>
                <h2 className="text-base font-semibold mb-3">Requirements</h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {job.requirements}
                </div>
              </section>
            )}

            {job.benefits && (
              <section>
                <h2 className="text-base font-semibold mb-3">Benefits</h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {job.benefits}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold">Job Details</h3>

              <dl className="space-y-3 text-sm">
                {typeLabel && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Employment Type</dt>
                    <dd className="font-medium">{typeLabel}</dd>
                  </div>
                )}
                {job.location && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Location</dt>
                    <dd className="font-medium">{job.location}</dd>
                  </div>
                )}
                {job.experience && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Experience</dt>
                    <dd className="font-medium">{job.experience}</dd>
                  </div>
                )}
                {hasSalary && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Salary Range</dt>
                    <dd className="font-medium text-primary">
                      {job.salaryMin && job.salaryMax
                        ? `₹${Number(job.salaryMin).toLocaleString("en-IN")} – ₹${Number(job.salaryMax).toLocaleString("en-IN")}`
                        : job.salaryMin
                        ? `From ₹${Number(job.salaryMin).toLocaleString("en-IN")}`
                        : `Up to ₹${Number(job.salaryMax).toLocaleString("en-IN")}`}
                    </dd>
                  </div>
                )}
                {job.openings && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{job.openings} opening{job.openings !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {job.applicationDeadline && (
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Apply by{" "}
                      {new Date(job.applicationDeadline).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </dl>

              <Link
                href={`/careers/${job.id}/apply`}
                className="mt-2 block w-full text-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                Apply Now
              </Link>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Posted{" "}
              {job.createdAt
                ? new Date(job.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "recently"}
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Vaivamm Capital. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
