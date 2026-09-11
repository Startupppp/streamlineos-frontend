import { notFound } from "next/navigation";
import { publicJobListContract } from "@/lib/public-schema";
import type { z } from "zod";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { publicGet } from "@/lib/public-fetch";

type Props = { params: Promise<{ orgSlug: string }> };

type CareersPageData = z.infer<typeof publicJobListContract>;

const typeLabels: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params;
  try {
    const data = await publicGet<CareersPageData>(`/public/careers/${orgSlug}/jobs`, undefined, publicJobListContract);
    if (!data) return { title: "Careers" };
    return { title: `${data.org.name} — Open Positions` };
  } catch {
    return { title: "Careers" };
  }
}

export default async function CareersPage({ params }: Props) {
  const { orgSlug } = await params;

  let data: CareersPageData;
  try {
    data = (await publicGet<CareersPageData>(`/public/careers/${orgSlug}/jobs`, undefined, publicJobListContract)) ?? notFound();
  } catch {
    notFound();
  }

  const { org, jobs } = data;

  return (
    <main className="min-h-dvh bg-background">
      <div className="border-b bg-white dark:bg-card">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="flex items-center gap-4 mb-4">
            {org.logo && (
              <Image src={org.logo} alt={org.name ?? ""} width={56} height={56} className="rounded-lg object-contain border" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{org.name}</h1>
              {org.industry && <p className="text-sm text-muted-foreground">{org.industry}</p>}
            </div>
          </div>
          <p className="text-muted-foreground">
            {jobs.length === 0
              ? "No open positions at this time. Check back soon."
              : `${jobs.length} open position${jobs.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/careers/${orgSlug}/jobs/${job.id}/apply`}
            className="block rounded-xl border bg-card px-5 py-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base truncate">{job.title}</h2>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      {job.location}
                    </span>
                  )}
                  {job.type && (
                    <span className="flex items-center gap-1">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                      {typeLabels[job.type] ?? job.type}
                    </span>
                  )}
                  {job.experience && (
                    <span className="flex items-center gap-1">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      {job.experience}
                    </span>
                  )}
                  {(job.salaryMin || job.salaryMax) && (
                    <span>
                      {job.salaryMin && job.salaryMax
                        ? `₹${Number(job.salaryMin).toLocaleString("en-IN")} – ₹${Number(job.salaryMax).toLocaleString("en-IN")}`
                        : job.salaryMin
                          ? `From ₹${Number(job.salaryMin).toLocaleString("en-IN")}`
                          : `Up to ₹${Number(job.salaryMax).toLocaleString("en-IN")}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {job.applicationDeadline && (
                  <p className="text-xs text-muted-foreground">
                    Deadline: {format(new Date(job.applicationDeadline), "dd MMM yyyy")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {job.openings > 1 ? `${job.openings} openings` : "1 opening"}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {jobs.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <svg className="h-12 w-12 mx-auto mb-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <p className="font-medium">No open positions right now</p>
            <p className="text-sm mt-1">We&apos;ll post new openings here when they become available.</p>
          </div>
        )}
      </div>
    </main>
  );
}
