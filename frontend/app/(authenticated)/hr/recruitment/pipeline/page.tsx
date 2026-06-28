"use client";

import { useCallback } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAtsKanban, useUpdateCandidateStage } from "@/lib/api/hooks/hr";
import { ErrorState } from "@/components/shared/error-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { PipelineKanban } from "@/components/hr/recruitment/pipeline-kanban";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import type { CandidateStatus } from "@/types/hr";

export default function PipelinePage() {
  const { data: pipeline, isLoading, isError, refetch } = useAtsKanban();
  const updateStage = useUpdateCandidateStage();

  const handleStageChange = useCallback(
    (candidateId: number, newStage: CandidateStatus) => {
      updateStage.mutate(
        { candidateId, stage: newStage },
        {
          onSuccess: (res) => {
            if (res.changed) {
              toast.success(`Moved to ${newStage}`);
            }
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [updateStage]
  );

  if (isError) {
    return (
      <PageWrapper title="Recruitment Pipeline" subtitle="Drag candidates between stages to update their status">
        <ErrorState description="Failed to load pipeline" onRetry={refetch} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Recruitment Pipeline"
      subtitle="Drag candidates between stages to update their status"
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/recruitment">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/hr/recruitment/candidates/new">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              New Candidate
            </Link>
          </Button>
        </div>
      }
    >
      <PipelineKanban
        stages={pipeline?.stages ?? []}
        onStageChange={handleStageChange}
        isLoading={isLoading}
      />
    </PageWrapper>
  );
}
