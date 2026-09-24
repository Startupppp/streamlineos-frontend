import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { z } from "zod";
import Link from "next/link";
import { format } from "date-fns";
import { publicGetNoStore } from "@/lib/public-fetch";
import { publicJobDetailContract } from "@/lib/public-schema";
import { ApplyFormIsland } from "@/features/careers/components/apply-form-island";

type Props = { params: Promise<{ orgSlug: string; jobId: string }> };

type JobDetail = z.infer<typeof publicJobDetailContract>;

/**
 * The job is fetched with no store rather than on the 60s public revalidate.
 * A closed job must stop accepting applications the moment it closes, and the
 * endpoint only serves `OPEN` ones — a cached copy would keep an apply form on
 * screen that the POST behind it would then refuse.
 */
async function loadJob(orgSlug: string, jobId: string): Promise<JobDetail | null> {
  const id = Number(jobId);
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    return await publicGetNoStore<JobDetail>(
      `/public/careers/${orgSlug}/jobs/${id}`,
      undefined,
      publicJobDetailContract,
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, jobId } = await params;
  const data = await loadJob(orgSlug, jobId);
  if (!data) return { title: "Apply" };
  return { title: `Apply — ${data.job.title} at ${data.org.name ?? "this company"}` };
}

export default async function ApplyPage({ params }: Props) {
  const { orgSlug, jobId } = await params;
  const data = await loadJob(orgSlug, jobId);
  if (!data) notFound();

  const { org, job } = data;
  const deadline = job.applicationDeadline ?? job.closingDate;

  return (
    <main className="min-h-dvh bg-background">
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href={`/careers/${orgSlug}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <svg
              className="h-4 w-4 mr-1.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to all openings
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold">{job.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {[org.name, job.location].filter(Boolean).join(" · ")}
          </p>
          {deadline && (
            <p className="text-xs text-muted-foreground mt-1">
              Applications close {format(new Date(deadline), "dd MMM yyyy")}
            </p>
          )}
        </div>

        {job.description && (
          <div className="mb-6 rounded-lg border px-4 py-4">
            <p className="text-sm font-medium mb-1.5">About this role</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
          </div>
        )}

        <ApplyFormIsland
          orgSlug={orgSlug}
          orgName={org.name ?? "this employer"}
          jobId={job.id}
          jobTitle={job.title}
          questions={job.screeningQuestions ?? []}
        />
      </div>
    </main>
  );
}
