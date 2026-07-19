"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateJobForm } from "@/features/hr/recruitment/jobs/create-job-form";
import { useJobPosting } from "@/hooks/api/hr/recruitment";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { useGenerateJobDescription } from "@/hooks/api/ai";

interface Props {
  params: Promise<{ jobId: string }>;
}

function EditJobContent({ jobId }: { jobId: number }) {
  const { data: job, isLoading, isError } = useJobPosting(jobId);
  const generateJd = useGenerateJobDescription();

  const aiActions = useMemo<AiAction[]>(() => {
    if (!job) return [];
    return [
      {
        key: "draft-jd",
        label: "Draft JD",
        description: "Generate a job description draft",
        run: async () => {
          const result = await generateJd.mutateAsync({
            title: job.title,
            requirements: job.requirements ?? undefined,
            location: job.location ?? undefined,
            type: job.type ?? undefined,
            salaryMin: job.salaryMin != null ? Number(job.salaryMin) : undefined,
            salaryMax: job.salaryMax != null ? Number(job.salaryMax) : undefined,
          });
          return { text: result.description };
        },
        onApply: () => {},
      },
    ];
  }, [job, generateJd]);

  const backLink = (
    <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
        <Link href="/hr/recruitment/jobs">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Jobs
        </Link>
      </Button>
      <div className="h-4 w-px bg-border" />
      <h1 className="text-sm font-semibold flex-1">Edit Job Opening</h1>
    </div>
  );

  if (isLoading) {
    return (
      <>
        {backLink}
        <div className="flex-1 flex flex-col gap-4 p-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        {backLink}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Unable to load this job</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            This job may no longer exist, or you do not have permission to view it.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/jobs">Back to Jobs</Link>
          </Button>
        </div>
      </>
    );
  }

  if (!job) {
    return (
      <>
        {backLink}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">This job no longer exists</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            The job posting may have been deleted or the link is invalid.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/recruitment/jobs">Back to Jobs</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
          <Link href="/hr/recruitment/jobs">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Jobs
          </Link>
        </Button>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-sm font-semibold flex-1">Edit Job Opening</h1>
        <AiActionsMenu actions={aiActions} triggerLabel="AI" menuLabel="AI assist" align="end" />
      </div>
      <CreateJobForm job={job} />
    </>
  );
}

export default function EditJobPage({ params }: Props) {
  const { jobId } = use(params);
  const id = parseInt(jobId, 10);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isNaN(id) ? (
        <>
          <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0">
            <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
              <Link href="/hr/recruitment/jobs">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to Jobs
              </Link>
            </Button>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-sm font-semibold flex-1">Edit Job Opening</h1>
          </div>
          <div className="flex items-center justify-center flex-1">
            <p className="text-sm text-muted-foreground">Invalid job ID.</p>
          </div>
        </>
      ) : (
        <EditJobContent jobId={id} />
      )}
    </div>
  );
}
