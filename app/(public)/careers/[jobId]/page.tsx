import {
  getJobPostingMetadata,
  getJobPostingDetail,
  getDepartmentName,
} from "@/server/queries/public";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  MapPin,
  Clock,
  Briefcase,
  Building2,
  Users,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";
import type { Metadata } from "next";
import { CareersHeader } from "@/features/careers/careers-header";
import { CareersFooter } from "@/features/careers/careers-footer";
import { jobPostingPath } from "@/lib/careers/job-slug";

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

  const deptName = job.departmentId
    ? await getDepartmentName(job.departmentId)
    : null;

  const typeLabel = job.type ? (JOB_TYPE_LABELS[job.type] ?? job.type) : null;
  const hasSalary = job.salaryMin !== null || job.salaryMax !== null;

  return (
    <div className="min-h-screen flex flex-col noir-mesh">
      <CareersHeader backHref="/careers" backLabel="All jobs" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/careers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all openings
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-2xl border bg-card/80 p-6 sm:p-8 shadow-soft">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {job.title}
              </h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {deptName && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 shrink-0 text-primary/70" />
                    {deptName}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                    {job.location}
                  </span>
                )}
                {typeLabel && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0 text-primary/70" />
                    {typeLabel}
                  </span>
                )}
                {job.experience && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 shrink-0 text-primary/70" />
                    {job.experience}
                  </span>
                )}
              </div>
            </div>

            {job.description && (
              <section className="rounded-xl border bg-card/60 p-6">
                <h2 className="text-base font-semibold mb-3">About this role</h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </div>
              </section>
            )}

            {job.requirements && (
              <section className="rounded-xl border bg-card/60 p-6">
                <h2 className="text-base font-semibold mb-3">Requirements</h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {job.requirements}
                </div>
              </section>
            )}

            {job.benefits && (
              <section className="rounded-xl border bg-card/60 p-6">
                <h2 className="text-base font-semibold mb-3">Benefits</h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {job.benefits}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border bg-card p-6 space-y-5 shadow-gold ring-1 ring-primary/10">
              <div className="flex items-center gap-3 pb-1 border-b border-border/60">
                <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-primary/10 ring-1 ring-primary/20 shrink-0">
                  <Image
                    src="/logo.svg"
                    alt="Vaivamm"
                    fill
                    className="object-contain p-1.5"
                  />
                </div>
                <h3 className="text-sm font-semibold">Job details</h3>
              </div>

              <dl className="space-y-4 text-sm">
                {typeLabel && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Employment type
                    </dt>
                    <dd className="font-medium">{typeLabel}</dd>
                  </div>
                )}
                {job.location && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Location
                    </dt>
                    <dd className="font-medium">{job.location}</dd>
                  </div>
                )}
                {job.experience && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Experience
                    </dt>
                    <dd className="font-medium">{job.experience}</dd>
                  </div>
                )}
                {hasSalary && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Salary range
                    </dt>
                    <dd className="font-semibold text-primary">
                      {job.salaryMin && job.salaryMax
                        ? `₹${Number(job.salaryMin).toLocaleString("en-IN")} – ₹${Number(job.salaryMax).toLocaleString("en-IN")}`
                        : job.salaryMin
                          ? `From ₹${Number(job.salaryMin).toLocaleString("en-IN")}`
                          : `Up to ₹${Number(job.salaryMax).toLocaleString("en-IN")}`}
                    </dd>
                  </div>
                )}
                {job.openings && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {job.openings} opening{job.openings !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {job.applicationDeadline && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Apply by{" "}
                      {new Date(job.applicationDeadline).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                )}
              </dl>

              <Link
                href={`${jobPostingPath(job.id, job.title)}/apply`}
                className="press-scale block w-full text-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-gold hover:bg-primary/90 transition-colors"
              >
                Apply now
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

      <CareersFooter />
    </div>
  );
}
