"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAtsKanban, useUpdateCandidateStage } from "@/hooks/api/hr";
import { ErrorState } from "@/components/shared/error-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PipelineKanban } from "./pipeline-kanban";
import { PipelineTable } from "./pipeline-table";
import { AddCandidateSheet } from "@/features/hr/recruitment/candidates-list/add-candidate-sheet";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";
import { toast } from "sonner";
import { KanbanSquare, TableIcon } from "lucide-react";
import { UserPlusIcon } from "@animateicons/react/lucide";
import type { CandidateStatus } from "@/types/hr";

type PipelineViewMode = "kanban" | "table";

const PIPELINE_VIEW_OPTIONS: ViewOption<PipelineViewMode>[] = [
  { value: "kanban", icon: KanbanSquare, label: "Kanban" },
  { value: "table", icon: TableIcon, label: "Table" },
];

export function RecruitmentPipelinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "table" ? "table" : "kanban";

  const { data: pipeline, isLoading, isError, refetch } = useAtsKanban();
  const updateStage = useUpdateCandidateStage();
  const [addOpen, setAddOpen] = useState(false);

  const handleOpenAdd = useCallback(() => setAddOpen(true), []);

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
        },
      );
    },
    [updateStage],
  );

  const handleViewChange = useCallback(
    (next: "kanban" | "table") => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "kanban") params.delete("view");
      else params.set("view", next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  if (isError) {
    return (
      <PageWrapper
        title="Recruitment Pipeline"
        subtitle="Drag candidates between stages to update their status"
      >
        <ErrorState
          title="Unable to load pipeline"
          description="Try again. If this keeps happening, check your permissions or contact an admin."
          onRetry={refetch}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Recruitment Pipeline"
      subtitle="Drag candidates between stages to update their status"
      noInternalScroll
      backHref="/hr/recruitment"
      filters={
        <ViewToggle<PipelineViewMode>
          value={view}
          options={PIPELINE_VIEW_OPTIONS}
          onChange={handleViewChange}
          showLabel
        />
      }
      actions={
        <AnimatedIconButton icon={UserPlusIcon} iconSize={14} size="sm" onClick={handleOpenAdd}>
          New Candidate
        </AnimatedIconButton>
      }
    >
      {view === "table" ? (
        <PipelineTable stages={pipeline?.stages ?? []} isLoading={isLoading} />
      ) : (
        <PipelineKanban
          stages={pipeline?.stages ?? []}
          onStageChange={handleStageChange}
          isLoading={isLoading}
        />
      )}
      <AddCandidateSheet open={addOpen} onOpenChange={setAddOpen} />
    </PageWrapper>
  );
}
