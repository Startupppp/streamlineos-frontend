"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateJobForm } from "@/features/hr/recruitment/jobs/create-job-form";
import { useJobPosting } from "@/hooks/api/hr/recruitment";

interface Props {
  params: Promise<{ jobId: string }>;
}

function EditJobContent({ jobId }: { jobId: number }) {
  const { data: job, isLoading, isError } = useJobPosting(jobId);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col gap-4 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Job posting not found.</p>
      </div>
    );
  }

  return <CreateJobForm job={job} />;
}

export default function EditJobPage({ params }: Props) {
  const { jobId } = use(params);
  const id = parseInt(jobId, 10);

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
        <h1 className="text-sm font-semibold">Edit Job Opening</h1>
      </div>
      <div className="flex-1 min-h-0">
        {isNaN(id) ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Invalid job ID.</p>
          </div>
        ) : (
          <EditJobContent jobId={id} />
        )}
      </div>
    </div>
  );
}
