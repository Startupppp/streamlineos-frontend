"use client";

import { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Briefcase, MailIcon, Phone, Star, ExternalLink, Calendar, FileText, Download, StickyNote } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AtsPipelineStage, AtsPipelineCandidate, CandidateStatus, SlaCandidateStatus } from "@/types/hr";

// ─── Column config ────────────────────────────────────────────────────────────

interface ColumnConfig {
  id: CandidateStatus;
  label: string;
  bg: string;
  border: string;
  badge: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "NEW",
    label: "New",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border-slate-300 dark:border-slate-600",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
  {
    id: "SCREENING",
    label: "Screening",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-300 dark:border-blue-700",
    badge: "bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
  },
  {
    id: "INTERVIEW",
    label: "Interview",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-300 dark:border-amber-700",
    badge: "bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-200",
  },
  {
    id: "OFFER",
    label: "Offer",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-300 dark:border-purple-700",
    badge: "bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200",
  },
  {
    id: "HIRED",
    label: "Hired",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-300 dark:border-green-700",
    badge: "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200",
  },
  {
    id: "REJECTED",
    label: "Rejected",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-300 dark:border-red-700",
    badge: "bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(val: Date | string | null): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── SLA badge ────────────────────────────────────────────────────────────────

const SLA_CONFIG: Record<SlaCandidateStatus, { dot: string; label: string; title: string }> = {
  ON_TRACK: {
    dot: "bg-green-500",
    label: "text-green-700 dark:text-green-400",
    title: "SLA: On Track",
  },
  AT_RISK: {
    dot: "bg-amber-500",
    label: "text-amber-700 dark:text-amber-400",
    title: "SLA: At Risk",
  },
  BREACHED: {
    dot: "bg-red-500",
    label: "text-red-700 dark:text-red-400",
    title: "SLA: Breached",
  },
};

const SLA_EMOJI: Record<SlaCandidateStatus, string> = {
  ON_TRACK: "🟢",
  AT_RISK: "🟡",
  BREACHED: "🔴",
};

function SlaBadge({ status }: { status: SlaCandidateStatus }) {
  const cfg = SLA_CONFIG[status];
  return (
    <span
      title={cfg.title}
      className={cn(
        "inline-flex items-center gap-0.5 text-[9px] font-semibold",
        cfg.label
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
      {SLA_EMOJI[status]}
    </span>
  );
}

// ─── Candidate detail sheet ───────────────────────────────────────────────────

interface CandidateSheetProps {
  candidate: AtsPipelineCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CandidateSheet({ candidate, open, onOpenChange }: CandidateSheetProps) {
  if (!candidate) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 gap-0 w-full sm:max-w-[900px]">
        {/* Header */}
        <SheetHeader className="shrink-0 px-5 pt-4 pb-3 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base leading-tight">{candidate.name}</SheetTitle>
              {candidate.jobTitle && (
                <p className="text-sm text-muted-foreground truncate">{candidate.jobTitle}</p>
              )}
            </div>
            <Link
              href={`/hr/recruitment/candidates/${candidate.id}`}
              className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Full Profile
            </Link>
          </div>
        </SheetHeader>

        {/* Split body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left — Resume PDF viewer */}
          <div className="flex-1 border-r bg-muted/20 flex flex-col min-w-0">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Resume
              </p>
              {candidate.resumeUrl && (
                <a
                  href={candidate.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              )}
            </div>
            {candidate.resumeUrl ? (
              <iframe
                src={candidate.resumeUrl}
                title="Candidate Resume"
                className="flex-1 w-full h-full border-0"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No resume uploaded</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    The candidate hasn&apos;t uploaded a resume yet.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right — Actions & info panel */}
          <div className="w-[280px] shrink-0 overflow-y-auto p-4 space-y-4">
            {/* Contact */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Contact
              </p>
              <div className="flex items-center gap-2 text-sm">
                <MailIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{candidate.email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{candidate.phone}</span>
                </div>
              )}
            </div>

            {/* Application */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Application
              </p>
              {candidate.jobTitle && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{candidate.jobTitle}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>Applied {formatDate(candidate.appliedAt)}</span>
              </div>
              {candidate.source && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Source:</span>
                  <Badge variant="secondary" className="text-xs">
                    {candidate.source}
                  </Badge>
                </div>
              )}
            </div>

            {/* Rating */}
            {candidate.rating !== null && (
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Rating
                </p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < (candidate.rating ?? 0)
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                  <span className="text-sm font-medium ml-1">{candidate.rating}/5</span>
                </div>
              </div>
            )}

            {/* SLA status */}
            {candidate.slaStatus && (
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  SLA Compliance
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full shrink-0",
                      SLA_CONFIG[candidate.slaStatus].dot
                    )}
                  />
                  <span className={cn("text-sm font-medium", SLA_CONFIG[candidate.slaStatus].label)}>
                    {candidate.slaStatus === "ON_TRACK"
                      ? "On Track"
                      : candidate.slaStatus === "AT_RISK"
                      ? "At Risk"
                      : "Breached"}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            {candidate.notes && (
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" />
                  Notes
                </p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {candidate.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Candidate card ───────────────────────────────────────────────────────────

interface CandidateCardProps {
  candidate: AtsPipelineCandidate;
  index: number;
  onClick: (candidate: AtsPipelineCandidate) => void;
}

function CandidateCard({ candidate, index, onClick }: CandidateCardProps) {
  return (
    <Draggable draggableId={String(candidate.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Card
            onClick={() => onClick(candidate)}
            className={cn(
              "p-2.5 cursor-pointer select-none transition-shadow hover:shadow-md",
              snapshot.isDragging && "shadow-lg ring-2 ring-primary/25 rotate-[0.5deg]"
            )}
          >
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                  {getInitials(candidate.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate leading-tight">{candidate.name}</p>

                {candidate.jobTitle ? (
                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <Briefcase className="h-2.5 w-2.5 shrink-0" />
                    {candidate.jobTitle}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <MailIcon className="h-2.5 w-2.5 shrink-0" />
                    {candidate.email}
                  </p>
                )}

                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {candidate.source && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 font-normal"
                    >
                      {candidate.source}
                    </Badge>
                  )}
                  {candidate.slaStatus && (
                    <SlaBadge status={candidate.slaStatus} />
                  )}
                  {candidate.rating !== null && (
                    <div className="flex items-center gap-0.5 ml-auto">
                      <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-medium text-amber-600">
                        {candidate.rating}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );
}

// ─── Column skeleton ──────────────────────────────────────────────────────────

function ColumnSkeleton({ col }: { col: ColumnConfig }) {
  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-6 ml-auto rounded-full" />
      </div>
      <div className={cn("flex-1 rounded-xl border p-2 space-y-2", col.bg, col.border)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main kanban ──────────────────────────────────────────────────────────────

interface PipelineKanbanProps {
  stages: AtsPipelineStage[];
  onStageChange: (candidateId: number, newStage: CandidateStatus) => void;
  isLoading?: boolean;
}

export function PipelineKanban({ stages, onStageChange, isLoading }: PipelineKanbanProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<AtsPipelineCandidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // State for rejection confirmation dialog
  const [pendingReject, setPendingReject] = useState<{
    candidateId: number;
    candidateName: string;
  } | null>(null);

  const stageMap = Object.fromEntries(stages.map((s) => [s.stage, s.candidates]));

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
        // Find candidate name for the dialog
        const candidate = stages
          .flatMap((s) => s.candidates)
          .find((c) => c.id === candidateId);
        setPendingReject({
          candidateId,
          candidateName: candidate?.name ?? `Candidate #${candidateId}`,
        });
      } else {
        onStageChange(candidateId, newStage);
      }
    },
    [onStageChange, stages]
  );

  const confirmReject = useCallback(() => {
    if (pendingReject) {
      onStageChange(pendingReject.candidateId, "REJECTED");
      setPendingReject(null);
    }
  }, [pendingReject, onStageChange]);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <ColumnSkeleton key={col.id} col={col} />
        ))}
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const items = stageMap[col.id] ?? [];
            const isRejected = col.id === "REJECTED";

            return (
              <div
                key={col.id}
                className={cn(
                  "flex flex-col min-w-[280px] w-[280px] shrink-0",
                  isRejected && "opacity-80"
                )}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-2 px-0.5">
                  <span className="text-xs font-semibold tracking-wide">{col.label}</span>
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold min-w-[22px]",
                      col.badge
                    )}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Droppable area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 rounded-xl border-2 p-2 transition-colors",
                        col.bg,
                        col.border,
                        snapshot.isDraggingOver && "ring-2 ring-primary/30"
                      )}
                    >
                      <div
                        className="overflow-y-auto space-y-2"
                        style={{ maxHeight: "calc(100vh - 250px)" }}
                      >
                        {items.map((candidate, index) => (
                          <CandidateCard
                            key={candidate.id}
                            candidate={candidate}
                            index={index}
                            onClick={handleCardClick}
                          />
                        ))}
                        {provided.placeholder}

                        {/* Empty state */}
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border/50">
                            <p className="text-[10px] text-muted-foreground">Drop here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Candidate detail sheet */}
      <CandidateSheet
        candidate={selectedCandidate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* Rejection confirmation dialog */}
      <AlertDialog
        open={!!pendingReject}
        onOpenChange={(open) => {
          if (!open) setPendingReject(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move{" "}
              <span className="font-semibold">{pendingReject?.candidateName}</span> to{" "}
              <span className="font-semibold text-destructive">Rejected</span>? This will notify
              the HR team.
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
