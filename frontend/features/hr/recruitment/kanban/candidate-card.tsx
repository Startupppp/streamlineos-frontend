"use client";

import { memo, useCallback } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Briefcase, MailIcon, Star, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtsPipelineCandidate } from "@/types/hr";
import { getInitials } from "./types";
import { SlaBadge } from "./sla-badge";

interface CandidateCardProps {
  candidate: AtsPipelineCandidate;
  index: number;
  onClick: (candidate: AtsPipelineCandidate) => void;
}

export const CandidateCard = memo(function CandidateCard({
  candidate,
  index,
  onClick,
}: CandidateCardProps) {
  const handleClick = useCallback(() => {
    onClick(candidate);
  }, [onClick, candidate]);

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
            snapshot.isDragging && "shadow-xl border-primary/40 ring-2 ring-primary/20 rotate-1 scale-105"
          )}
        >
          <div
            {...provided.dragHandleProps}
            className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <div className="p-3">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 bg-gradient-to-br from-primary/25 to-primary/10 text-primary border border-primary/20">
                {getInitials(candidate.name)}
              </div>
              <div className="min-w-0 flex-1 pr-5">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">{candidate.name}</p>
                <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  {candidate.jobTitle ? (
                    <>
                      <Briefcase className="h-2.5 w-2.5 shrink-0" />
                      {candidate.jobTitle}
                    </>
                  ) : (
                    <>
                      <MailIcon className="h-2.5 w-2.5 shrink-0" />
                      {candidate.email}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {candidate.source && (
                <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/50">
                  {candidate.source}
                </span>
              )}
              {candidate.slaStatus && <SlaBadge status={candidate.slaStatus} />}
              {candidate.rating !== null && candidate.rating !== undefined && (
                <div className="flex items-center gap-0.5 ml-auto">
                  <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-600">{candidate.rating}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});
