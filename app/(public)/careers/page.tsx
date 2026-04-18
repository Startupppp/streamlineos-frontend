import { db } from "@/lib/db";
import { jobPostings, departments } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { MapPin, Clock, Briefcase, Building2, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Careers",
  description: "Explore open positions at Vaivamm Capital. Join our team of driven professionals.",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
};

export default async function CareersPage() {
  let jobs: Array<{
    id: number;
    title: string;
    location: string | null;
    type: string | null;
    experience: string | null;
    openings: number | null;
    applicationDeadline: string | null;
    createdAt: Date | null;
    salaryMin: string | null;
    salaryMax: string | null;
    departmentId: number | null;
  }> = [];
  let deptMap = new Map<number, string>();

  try {
    jobs = await db
      .select({
        id: jobPostings.id,
        title: jobPostings.title,
        location: jobPostings.location,
        type: jobPostings.type,
        experience: jobPostings.experience,
        openings: jobPostings.openings,
        applicationDeadline: jobPostings.applicationDeadline,
        createdAt: jobPostings.createdAt,
        salaryMin: jobPostings.salaryMin,
        salaryMax: jobPostings.salaryMax,
        departmentId: jobPostings.departmentId,
      })
      .from(jobPostings)
      .where(eq(jobPostings.status, "OPEN"))
      .orderBy(desc(jobPostings.createdAt));

    const departmentIds = [...new Set(jobs.map((j) => j.departmentId).filter((id): id is number => id !== null))];
    const deptRows = departmentIds.length > 0
      ? await db
          .select({ id: departments.id, name: departments.name })
          .from(departments)
          .where(inArray(departments.id, departmentIds))
      : [];
    deptMap = new Map(deptRows.map((d) => [d.id, d.name]));
  } catch {
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold tracking-tight">Vaivamm Capital</span>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to site
          </Link>
        </div>
      </header>

      <section className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Join Vaivamm Capital
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            We&apos;re building the future of capital markets. Come grow with us.
          </p>
          <p className="mt-3 text-sm font-medium text-primary">
            {jobs.length} open position{jobs.length !== 1 ? "s" : ""}
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {jobs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No open positions right now.</p>
            <p className="text-sm mt-1">Check back soon — we&apos;re always growing.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const deptName = job.departmentId ? deptMap.get(job.departmentId) : null;
              const typeLabel = job.type ? (JOB_TYPE_LABELS[job.type] ?? job.type) : null;
              const hasSalary = job.salaryMin !== null || job.salaryMax !== null;

              return (
                <Link
                  key={job.id}
                  href={`/careers/${job.id}`}
                  className="block group"
                >
                  <div className="rounded-lg border bg-card p-5 hover:border-primary/50 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold group-hover:text-primary transition-colors truncate">
                          {job.title}
                        </h2>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                          {deptName && (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              {deptName}
                            </span>
                          )}
                          {job.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {job.location}
                            </span>
                          )}
                          {typeLabel && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              {typeLabel}
                            </span>
                          )}
                          {job.experience && (
                            <span className="flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 shrink-0" />
                              {job.experience}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {typeLabel && (
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground">
                              {typeLabel}
                            </span>
                          )}
                          {hasSalary && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              {job.salaryMin && job.salaryMax
                                ? `₹${Number(job.salaryMin).toLocaleString("en-IN")} – ₹${Number(job.salaryMax).toLocaleString("en-IN")}`
                                : job.salaryMin
                                ? `From ₹${Number(job.salaryMin).toLocaleString("en-IN")}`
                                : `Up to ₹${Number(job.salaryMax).toLocaleString("en-IN")}`}
                            </span>
                          )}
                          {job.openings && job.openings > 1 && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              {job.openings} openings
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors mt-0.5" />
                    </div>

                    {job.applicationDeadline && (
                      <p className="mt-3 text-xs text-muted-foreground border-t pt-3">
                        Apply by{" "}
                        {new Date(job.applicationDeadline).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Vaivamm Capital. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
