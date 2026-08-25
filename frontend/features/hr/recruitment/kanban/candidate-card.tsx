"use client";

import { memo, useCallback } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Briefcase, MailIcon, Star, GripVertical, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtsPipelineCandidate } from "@/types/hr";
import { getInitials } from "./types";
import { SlaBadge } from "./sla-badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatDistanceToNow } from "date-fns";

interface CandidateCardProps {
  candidate: AtsPipelineCandidate;
  index: number;
  onClick: (candidate: AtsPipelineCandidate) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  LINKEDIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  REFERRAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  DIRECT: "bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-300",
  JOB_PORTAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CAMPUS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function getSourceColor(source: string) {
  return SOURCE_COLORS[source] ?? "bg-muted text-muted-foreground";
}

export const CandidateCard = memo(function CandidateCard({
  candidate,
  index,
  onClick,
}: CandidateCardProps) {
  const handleClick = useCallback(() => {
    onClick(candidate);
  }, [onClick, candidate]);

  function handleDragHandleClick(e: React.MouseEvent) { e.stopPropagation(); }

  const initials = getInitials(candidate.name);
  const hasRating = candidate.rating !== null && candidate.rating !== undefined;

  return (
    <Draggable draggableId={String(candidate.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={handleClick}
          className={cn(
            "group relative rounded-xl bg-card border border-border/70 shadow-sm cursor-pointer select-none transition-all duration-200",
            "hover:shadow-md hover:border-border hover:-translate-y-0.5",
            snapshot.isDragging && "shadow-xl border-primary/40 ring-2 ring-primary/20 rotate-1 scale-[1.03]"
          )}
        >
          <div
            {...provided.dragHandleProps}
            className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-60 transition-opacity cursor-grab active:cursor-grabbing"
            onClick={handleDragHandleClick}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <div className="p-3 space-y-2.5">
            <div className="flex items-center gap-2.5 pr-5">
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-dense font-bold shrink-0 bg-gradient-to-br from-primary/20 to-primary/10 text-primary border border-primary/20 ring-2 ring-background">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <TruncatedText text={candidate.name} className="text-xs font-semibold text-foreground leading-tight" />
                <div className="flex items-center gap-1 mt-0.5">
                  {candidate.jobTitle ? (
                    <>
                      <Briefcase className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                      <TruncatedText text={candidate.jobTitle} className="text-micro text-muted-foreground" />
                    </>
                  ) : (
                    <>
                      <MailIcon className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                      <TruncatedText text={candidate.email} className="text-micro text-muted-foreground" />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {candidate.source && (
                <span className={cn(
                  "inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                  getSourceColor(candidate.source)
                )}>
                  {candidate.source.replace(/_/g, " ")}
                </span>
              )}
              {candidate.slaStatus && <SlaBadge status={candidate.slaStatus} />}
            </div>

            {(hasRating || candidate.appliedAt) && (
              <div className="flex items-center justify-between">
                {hasRating ? (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-2.5 w-2.5",
                          i < (candidate.rating ?? 0)
                            ? "text-amber-400 fill-amber-400"
                            : "text-border fill-transparent"
                        )}
                      />
                    ))}
                    <span className="text-micro font-semibold text-amber-600 dark:text-amber-400 ml-0.5">{candidate.rating}</span>
                  </div>
                ) : <span />}
                {candidate.appliedAt && (
                  <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(candidate.appliedAt), { addSuffix: true })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
});
