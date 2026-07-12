"use client";

import { useCallback, useState } from "react";
import {
  Plus,
  ArrowRight,
  X,
  GripVertical,
  Building2,
  Clock,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, resolveImageUrl } from "@/lib/utils";
import { formatINRCompact, getInitials } from "@/lib/format-utils";
import { toast } from "sonner";
import { useSelfAssignLead } from "@/hooks/api";
import { useLeadScoreExplanation } from "@/hooks/api/leads";
import type { BoardLead } from "./leads-types";

const FALLBACK_STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;

const SOURCE_COLORS: Record<string, string> = {
  referral: "bg-green-500/15 text-green-400 border-green-500/20",
  campaign: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  cold_call: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  website: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  social_media: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  walk_in: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  other: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

const PRIORITY_CONFIG: Record<string, string> = {
  HOT: "bg-red-500/15 text-red-400 border-red-500/30",
  WARM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  COLD: "bg-blue-400/15 text-blue-400 border-blue-400/30",
};

function timeAgo(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    if (absDiff < 3600) return `in ${Math.floor(absDiff / 60)}m`;
    if (absDiff < 86400) return `in ${Math.floor(absDiff / 3600)}h`;
    return `in ${Math.floor(absDiff / 86400)}d`;
  }
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}
import { AIScoreButton } from "./ai-score-button";
import {
  differenceInHours,
  differenceInMinutes,
  isPast,
  format,
} from "date-fns";

interface KanbanCardProps {
  lead: BoardLead;
  index: number;
  status: string;
  onOpen: (id: number) => void;
  onMoveStatus: (
    leadId: number,
    status: string,
    expectedStatus?: string,
  ) => void;
}

const PRIORITY_BORDER: Record<string, string> = {
  HOT: "border-l-red-500",
  WARM: "border-l-amber-500",
  COLD: "border-l-blue-400",
};

function SlaCountdown({ deadline }: { deadline: string | Date }) {
  const d = new Date(deadline);
  const overdue = isPast(d);
  const hoursLeft = differenceInHours(d, new Date());
  const minutesLeft = differenceInMinutes(d, new Date());
  const urgent = !overdue && hoursLeft < 4;

  const label = overdue
    ? `Overdue ${Math.abs(hoursLeft)}h`
    : hoursLeft < 1
      ? `${minutesLeft}m left`
      : `${hoursLeft}h left`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
              overdue
                ? "bg-red-500/10 text-red-500 border-red-500/30"
                : urgent
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                  : "bg-muted text-muted-foreground border-border",
            )}
          >
            {overdue ? (
              <AlertTriangle className="h-2.5 w-2.5" />
            ) : (
              <Clock className="h-2.5 w-2.5" />
            )}
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          SLA deadline: {format(d, "dd MMM yyyy, HH:mm")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ScoreExplainerBadge({
  leadId,
  score,
}: {
  leadId: number;
  score: number;
}) {
  const [enabled, setEnabled] = useState(false);
  const { data } = useLeadScoreExplanation(leadId, enabled);

  const handleTooltipOpenChange = useCallback((open: boolean) => {
    if (open) setEnabled(true);
  }, []);
  const handleStopPropagation = useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    [],
  );

  const color =
    score >= 80
      ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
      : score >= 60
        ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
        : score >= 40
          ? "text-orange-500 border-orange-500/30 bg-orange-500/10"
          : "text-red-400 border-red-400/30 bg-red-400/10";

  return (
    <TooltipProvider>
      <Tooltip onOpenChange={handleTooltipOpenChange}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold cursor-help",
              color,
            )}
            onClick={handleStopPropagation}
          >
            <Info className="h-2.5 w-2.5 opacity-60" />
            {score}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-56 p-2 space-y-1.5"
          onClick={handleStopPropagation}
        >
          <p className="text-xs font-semibold">Score: {score}/100</p>
          {data ? (
            data.firedRules.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No scoring rules matched this lead.
              </p>
            ) : (
              <div className="space-y-1">
                {data.firedRules.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="truncate">{r.name}</span>
                    <span className="font-semibold text-emerald-500 shrink-0">
                      +{r.points}
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground pt-0.5 border-t border-border">
                  {data.firedRules.length} of {data.totalRules} rules matched
                </p>
              </div>
            )
          ) : (
            <p className="text-[11px] text-muted-foreground">Loading...</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export function KanbanCard({
  lead,
  index,
  status,
  onOpen,
  onMoveStatus,
}: KanbanCardProps) {
  const selfAssign = useSelfAssignLead();

  const handleOpen = useCallback(() => onOpen(lead.id), [lead.id, onOpen]);
  const handleSelfAssign = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selfAssign.mutate(lead.id, {
        onSuccess: () => toast.success("Lead assigned to you"),
      });
    },
    [lead.id, selfAssign],
  );
  const handleMarkLost = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMoveStatus(lead.id, "LOST", status);
    },
    [lead.id, status, onMoveStatus],
  );
  const handleMoveNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const nextIdx = (FALLBACK_STATUSES as readonly string[]).indexOf(status) + 1;
      if (nextIdx < FALLBACK_STATUSES.length - 1)
        onMoveStatus(lead.id, FALLBACK_STATUSES[nextIdx] as string, status);
    },
    [lead.id, status, onMoveStatus],
  );

  const priorityBorder = lead.priority
    ? (PRIORITY_BORDER[lead.priority] ?? "")
    : "";

  return (
    <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          className="group"
        >
          <Card
            className={cn(
              "cursor-pointer transition-all border-l-[3px]",
              priorityBorder || "border-l-transparent",
              dragSnapshot.isDragging
                ? "shadow-xl ring-2 ring-blue-500/30 rotate-[2deg] scale-105"
                : "hover:shadow-md hover:border-blue-500/30",
            )}
            onClick={handleOpen}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div
                  {...dragProvided.dragHandleProps}
                  className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lead.name}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground/50 leading-none mt-0.5">
                        LD-{String(lead.id).padStart(5, "0")}
                      </p>
                    </div>
                    {lead.assignedTo ? (
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage
                          src={resolveImageUrl(lead.assignedTo.image)}
                        />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(lead.assignedTo.name ?? "")}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <button
                        onClick={handleSelfAssign}
                        className="h-6 w-6 shrink-0 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-blue-500/50 transition-colors"
                        aria-label="Self-assign this lead"
                      >
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {lead.company && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      {lead.company}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {lead.priority && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full border font-semibold",
                          PRIORITY_CONFIG[lead.priority] ?? PRIORITY_CONFIG["WARM"],
                        )}
                      >
                        {lead.priority}
                      </span>
                    )}
                    {lead.source && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full border",
                          SOURCE_COLORS[lead.source] || SOURCE_COLORS.other,
                        )}
                      >
                        {lead.source.replace("_", " ")}
                      </span>
                    )}
                    {lead.potentialValue && Number(lead.potentialValue) > 0 && (
                      <span className="text-[10px] text-blue-600 font-semibold">
                        {formatINRCompact(lead.potentialValue)}
                      </span>
                    )}
                    {lead.slaDeadline && (
                      <span onClick={stopPropagation}>
                        <SlaCountdown deadline={lead.slaDeadline} />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {lead.createdAt ? timeAgo(lead.createdAt) : "—"}
                      </span>
                      {lead.score != null && lead.score > 0 ? (
                        <ScoreExplainerBadge
                          leadId={lead.id}
                          score={lead.score}
                        />
                      ) : (
                        <div onClick={stopPropagation}>
                          <AIScoreButton
                            leadId={lead.id}
                            currentScore={lead.score}
                            compact
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {status !== "CONVERTED" && status !== "LOST" && (
                        <>
                          <button
                            onClick={handleMarkLost}
                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-red-500/20 transition-colors"
                            aria-label="Mark as lost"
                          >
                            <X className="h-3 w-3 text-red-400" />
                          </button>
                          <button
                            onClick={handleMoveNext}
                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-blue-500/20 transition-colors"
                            aria-label="Move to next stage"
                          >
                            <ArrowRight className="h-3 w-3 text-blue-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
