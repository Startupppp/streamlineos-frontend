"use client";

import { use, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CreateJobForm } from "@/features/hr/recruitment/jobs/create-job-form";
import { useJobPosting } from "@/hooks/api/hr/recruitment";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { useGenerateJobDescription } from "@/hooks/api/ai";

interface Props {
  params: Promise<{ jobId: string }>;
}

function EditJobContent({ jobId }: { jobId: number }) {
  const { data: job, isLoading, isError, error, refetch } = useJobPosting(jobId);
  const pageState = usePageState({ isLoading: false, isError, error });
  const generateJd = useGenerateJobDescription();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const aiActions = useMemo<AiAction[]>(() => {
    if (!job) return [];
    return [
      {
        key: "draft-jd",
        label: "Draft JD",
        description: "Generate a job description draft",
        run: async (signal, onToken) => {
          const result = await generateJd.mutateAsync({
            title: job.title,
            requirements: job.requirements ?? undefined,
            location: job.location ?? undefined,
            type: job.type ?? undefined,
            salaryMin: job.salaryMin != null ? Number(job.salaryMin) : undefined,
            salaryMax: job.salaryMax != null ? Number(job.salaryMax) : undefined,
            signal,
            onToken,
          });
          return { text: result.text };
        },
        onApply: () => {},
      },
    ];
  }, [job, generateJd]);

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
        {null}
      </PageState>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!job) {
    return (
      <EmptyState
        illustrationPreset="search"
        title="This job no longer exists"
        description="The job posting may have been deleted, or the link is invalid."
        action={{ label: "Back to jobs", href: "/hr/recruitment/jobs" }}
      />
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
        <EmptyState
          illustrationPreset="search"
          title="That job link is not valid"
          description="The address does not name a job posting."
          action={{ label: "Back to jobs", href: "/hr/recruitment/jobs" }}
        />
      </PageWrapper>
    );
  }

  return <EditJobContent jobId={id} />;
}
