"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAtsKanban, useUpdateCandidateStage } from "@/hooks/api/hr";
import { ErrorState } from "@/components/shared/error-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { PipelineKanban } from "@/components/hr/recruitment/pipeline-kanban";
import { PipelineTable } from "@/components/hr/recruitment/pipeline-table";
import { AddCandidateSheet } from "@/features/hr/recruitment/candidates-list/add-candidate-sheet";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, UserPlus, KanbanSquare, TableIcon } from "lucide-react";
import type { CandidateStatus } from "@/types/hr";
import { cn } from "@/lib/utils";

export default function PipelinePage() {
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

  function handleViewKanban() { handleViewChange("kanban"); }
  function handleViewTable() { handleViewChange("table"); }

  if (isError) {
    return (
      <PageWrapper
        title="Recruitment Pipeline"
        subtitle="Drag candidates between stages to update their status"
 variant="display">
        <ErrorState description="Failed to load pipeline" onRetry={refetch} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Recruitment Pipeline"
      subtitle="Drag candidates between stages to update their status"
      noInternalScroll
      filters={
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={handleViewKanban}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              view === "kanban" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <KanbanSquare className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            type="button"
            onClick={handleViewTable}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              view === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TableIcon className="h-3.5 w-3.5" />
            Table
          </button>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/recruitment">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
          <Button size="sm" onClick={handleOpenAdd}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            New Candidate
          </Button>
        </div>
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
