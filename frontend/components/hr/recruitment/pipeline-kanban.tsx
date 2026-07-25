"use client";

import { useState, useCallback, memo } from "react";
import { ArrowRight, XCircle } from "lucide-react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type {
  AtsPipelineStage,
  AtsPipelineCandidate,
  CandidateStatus,
} from "@/types/hr";
import {
  COLUMNS,
  CandidateCard,
  CandidateSheet,
  ColumnSkeleton,
  type ColumnConfig,
} from "@/features/hr/recruitment/kanban";


interface KanbanColumnProps {
  col: ColumnConfig;
  items: AtsPipelineCandidate[];
  total: number;
  isRejected: boolean;
  onCardClick: (candidate: AtsPipelineCandidate) => void;
}

const KanbanColumn = memo(function KanbanColumn({
  col,
  items,
  total,
  isRejected,
  onCardClick,
}: KanbanColumnProps) {
  return (
    <div className={cn("flex flex-col w-full min-w-0", isRejected && "opacity-75")}>
      <div className={cn(
        "flex items-center justify-between rounded-t-xl px-3 py-2.5 bg-gradient-to-r mb-0",
        col.headerGradient
      )}>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", col.dot)} />
          <span className={cn("text-xs font-semibold tracking-wide", col.headerText)}>{col.label}</span>
        </div>
        <span className={cn(
          "inline-flex items-center justify-center rounded-full min-w-[22px] h-5 px-1.5 text-[11px] font-bold bg-white/25",
          col.headerText
        )}>
          {total}
        </span>
      </div>

      <Droppable droppableId={col.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 rounded-b-xl rounded-tr-xl border-2 p-2 transition-colors min-h-[60px]",
              col.bg,
              col.border,
              snapshot.isDraggingOver && "ring-2 ring-primary/20 border-primary/30 bg-primary/5"
            )}
          >
            <div className="overflow-y-auto space-y-2" style={{ maxHeight: "calc(100dvh - 300px)" }}>
              {items.map((candidate, index) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  index={index}
                  onClick={onCardClick}
                />
              ))}
              {provided.placeholder}
              {items.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex flex-col items-center justify-center h-16 rounded-lg border border-dashed border-border/40 gap-1">
                  <p className="text-[10px] text-muted-foreground/60 font-medium">Drop here</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
});

interface PipelineKanbanProps {
  stages: AtsPipelineStage[];
  onStageChange: (candidateId: number, newStage: CandidateStatus) => void;
  isLoading?: boolean;
}

export function PipelineKanban({
  stages,
  onStageChange,
  isLoading,
}: PipelineKanbanProps) {
  const [selectedCandidate, setSelectedCandidate] =
    useState<AtsPipelineCandidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingReject, setPendingReject] = useState<{
    candidateId: number;
    candidateName: string;
  } | null>(null);

  const stageMap = Object.fromEntries(stages.map((s) => [s.stage, s.candidates]));
  const stageTotals = Object.fromEntries(stages.map((s) => [s.stage, s.total]));

  const handleCardClick = useCallback((candidate: AtsPipelineCandidate) => {
    setSelectedCandidate(candidate);
    setSheetOpen(true);
  }, []);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const candidateId = Number(result.draggableId);
      const newStage = result.destination.droppableId as CandidateStatus;
      if (result.source.droppableId === newStage) return;

      if (newStage === "REJECTED") {
        const candidate = stages.flatMap((s) => s.candidates).find((c) => c.id === candidateId);
        setPendingReject({ candidateId, candidateName: candidate?.name ?? `Candidate #${candidateId}` });
      } else {
        onStageChange(candidateId, newStage);
      }
    },
    [onStageChange, stages],
  );

  const confirmReject = useCallback(() => {
    if (pendingReject) {
      onStageChange(pendingReject.candidateId, "REJECTED");
      setPendingReject(null);
    }
  }, [pendingReject, onStageChange]);

  const handleRejectDialogChange = useCallback((open: boolean) => {
    if (!open) setPendingReject(null);
  }, []);

  const FLOW_STAGES = [
    { label: "New", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", count: stageTotals["NEW"] ?? 0 },
    { label: "Screening", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", count: stageTotals["SCREENING"] ?? 0 },
    { label: "Interview", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", count: stageTotals["INTERVIEW"] ?? 0 },
    { label: "Offer", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", count: stageTotals["OFFER"] ?? 0 },
    { label: "Hired", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300", count: stageTotals["HIRED"] ?? 0 },
  ];
  const rejectedCount = stageTotals["REJECTED"] ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="hidden xl:flex items-center gap-1.5 px-1">
          {FLOW_STAGES.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="h-6 w-20 rounded bg-muted animate-pulse" />
              {i < FLOW_STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />}
            </div>
          ))}
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {COLUMNS.map((col) => (
            <ColumnSkeleton key={col.id} col={col} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden xl:flex items-center gap-1.5 px-1 mb-3 flex-wrap">
        {FLOW_STAGES.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
              {s.label}
              {s.count > 0 && (
                <span className="ml-0.5 font-bold">{s.count}</span>
              )}
            </span>
            {i < FLOW_STAGES.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            )}
          </div>
        ))}
        {rejectedCount > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">
            <XCircle className="h-3 w-3" />
            Rejected
            <span className="font-bold">{rejectedCount}</span>
          </span>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 pb-4 items-start">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              items={stageMap[col.id] ?? []}
              total={stageTotals[col.id] ?? 0}
              isRejected={col.id === "REJECTED"}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </DragDropContext>

      <CandidateSheet
        candidate={selectedCandidate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <AlertDialog open={!!pendingReject} onOpenChange={handleRejectDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              Move <span className="font-semibold">{pendingReject?.candidateName}</span> to{" "}
              <span className="font-semibold text-destructive">Rejected</span>? This will notify the HR team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
