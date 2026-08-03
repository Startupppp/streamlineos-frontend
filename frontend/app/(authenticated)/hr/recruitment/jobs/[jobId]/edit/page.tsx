"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Unable to load this job</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          This job may no longer exist, or you do not have permission to view it.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/hr/recruitment/jobs">Back to Jobs</Link>
        </Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">This job no longer exists</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          The job posting may have been deleted or the link is invalid.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/hr/recruitment/jobs">Back to Jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <PageWrapper
      title="Edit Job Opening"
      backHref="/hr/recruitment/jobs"
      backLabel="Back to Jobs"
      actions={
        <AiActionsMenu actions={aiActions} triggerLabel="AI" menuLabel="AI assist" align="end" />
      }
      noInternalScroll
      contentClassName="p-0 overflow-hidden"
    >
      <CreateJobForm job={job} />
    </PageWrapper>
  );
}

export default function EditJobPage({ params }: Props) {
  const { jobId } = use(params);
  const id = parseInt(jobId, 10);

  if (isNaN(id)) {
    return (
      <PageWrapper
        title="Edit Job Opening"
        backHref="/hr/recruitment/jobs"
        backLabel="Back to Jobs"
      >
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-muted-foreground">Invalid job ID.</p>
        </div>
      </PageWrapper>
    );
  }

  return <EditJobContent jobId={id} />;
}
