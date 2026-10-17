"use client";

import { useState, useCallback, memo } from "react";
import { ArrowRight, XCircle } from "lucide-react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import type { RejectionDetails } from "@/hooks/api/hr/recruitment/rejection-reasons-schema";
import { RejectCandidateDialog } from "@/features/recruitment/reject-candidate-dialog";
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
} from "./kanban";


interface KanbanColumnProps {
  col: ColumnConfig;
  items: AtsPipelineCandidate[];
  total: number;
  /** How many of `total` the endpoint actually sent for this stage. */
  shown: number;
  truncated: boolean;
  roundLabel: string | null;
  isRejected: boolean;
  onCardClick: (candidate: AtsPipelineCandidate) => void;
}

const KanbanColumn = memo(function KanbanColumn({
  col,
  items,
  total,
  shown,
  truncated,
  roundLabel,
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
          <span className="min-w-0">
            <span className={cn("block text-xs font-semibold tracking-wide", col.headerText)}>{col.label}</span>
            {roundLabel && (
              <span className="block truncate text-micro text-white/80" title={roundLabel}>
                {roundLabel}
              </span>
            )}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full min-w-[22px] h-5 px-1.5 text-dense font-bold bg-white/25",
            col.headerText
          )}
          title={
            truncated
              ? `Showing ${shown} of ${total} candidates in this stage`
              : `${total} candidate${total === 1 ? "" : "s"} in this stage`
          }
        >
          {/*
            The endpoint caps each stage, so printing `total` over a shorter
            list claimed candidates this board never received. When the column
            is cut, say both numbers.
          */}
          {truncated ? `${shown}/${total}` : total}
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
                  <p className="text-micro text-muted-foreground font-medium">Drop here</p>
                </div>
              )}
              {truncated && (
                <p className="text-micro text-muted-foreground text-center pt-1">
                  {total - shown} more in this stage are not shown here. Filter the candidate list
                  to reach them.
                </p>
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
  /**
   * `rejection` is present exactly when `newStage` is `REJECTED`. The endpoint
   * refuses a reject with no reason, so the board collects one before it calls
   * back rather than letting a drag produce a 422 the recruiter cannot act on.
   */
  onStageChange: (
    candidateId: number,
    newStage: CandidateStatus,
    rejection?: RejectionDetails,
  ) => void;
  isRejecting?: boolean;
  isLoading?: boolean;
}

export function PipelineKanban({
  stages,
  onStageChange,
  isRejecting,
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
  const stageCounts = Object.fromEntries(
    stages.map((s) => [s.stage, { total: s.total, shown: s.shown, truncated: s.truncated, roundLabel: s.roundLabel ?? null }]),
  );

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

  const confirmReject = useCallback(
    (rejection: RejectionDetails) => {
      if (pendingReject) {
        onStageChange(pendingReject.candidateId, "REJECTED", rejection);
        setPendingReject(null);
      }
    },
    [pendingReject, onStageChange],
  );

  const cancelReject = useCallback(() => setPendingReject(null), []);

  const FLOW_STAGES = [
    { label: "New", color: "bg-muted text-muted-foreground", count: stageCounts["NEW"]?.total ?? 0 },
    { label: "Screening", color: "bg-status-info-surface text-status-info-ink", count: stageCounts["SCREENING"]?.total ?? 0 },
    { label: "Interview", color: "bg-status-warning-surface text-status-warning-ink", count: stageCounts["INTERVIEW"]?.total ?? 0 },
    { label: "Offer", color: "bg-status-info-surface text-status-info-ink", count: stageCounts["OFFER"]?.total ?? 0 },
    { label: "Hired", color: "bg-status-success-surface text-status-success-ink", count: stageCounts["HIRED"]?.total ?? 0 },
  ];
  const rejectedCount = stageCounts["REJECTED"]?.total ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="hidden xl:flex items-center gap-1.5 px-1">
          {FLOW_STAGES.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="h-6 w-20 rounded bg-muted animate-pulse" />
              {i < FLOW_STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
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
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
        {rejectedCount > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-status-danger-surface text-status-danger-ink">
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
              total={stageCounts[col.id]?.total ?? 0}
              shown={stageCounts[col.id]?.shown ?? 0}
              truncated={stageCounts[col.id]?.truncated ?? false}
              roundLabel={stageCounts[col.id]?.roundLabel ?? null}
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

      <RejectCandidateDialog
        candidateName={pendingReject?.candidateName ?? null}
        isPending={isRejecting}
        onCancel={cancelReject}
        onConfirm={confirmReject}
      />
    </>
  );
}
