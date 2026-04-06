"use client";

import { useCallback } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRecruitmentPipeline, useUpdateCandidate } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CandidateKanban } from "@/features/hr/recruitment/candidate-kanban";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CandidateStatus } from "@/types/hr";

export default function PipelinePage() {
  const { data: pipeline, isLoading } = useRecruitmentPipeline();
  const updateCandidate = useUpdateCandidate();

  const handleStatusChange = useCallback(
    (candidateId: number, newStatus: CandidateStatus) => {
      updateCandidate.mutate(
        { id: candidateId, status: newStatus },
        {
          onSuccess: () => toast.success(`Moved to ${newStatus}`),
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [updateCandidate]
  );

  if (isLoading) {
    return (
      <PageWrapper title="Candidate Pipeline" subtitle="Drag candidates between stages">
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-[240px] space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Candidate Pipeline"
      subtitle="Drag candidates between stages to update their status"
      noInternalScroll
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/recruitment"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link>
        </Button>
      }
    >
      <CandidateKanban
        pipeline={pipeline ?? {}}
        onStatusChange={handleStatusChange}
      />
    </PageWrapper>
  );
}
