"use client";

import { useCallback, useState, memo } from "react";
import {
  Plus,
  GripVertical,
  Building2,
  Clock,
  AlertTriangle,
  Info,
} from "lucide-react";
import { XIcon, MoveRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
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
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatINRCompact, getInitials } from "@/lib/format-utils";
import { toast } from "sonner";
import { useSelfAssignLead } from "@/hooks/api";
import { useLeadScoreExplanation } from "@/hooks/api/leads";
import type { BoardLead } from "./leads-types";

const FALLBACK_STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;

const SOURCE_COLORS: Record<string, string> = {
  referral: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  campaign: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  cold_call: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  website: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  social_media: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  walk_in: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  other: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_CONFIG: Record<string, string> = {
  HOT: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  WARM: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  COLD: "bg-status-info-surface text-status-info-ink border-status-info-rule",
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
  allStatusKeys?: string[];
  onOpen: (id: number) => void;
  onMoveStatus: (
    leadId: number,
    status: string,
    expectedStatus?: string,
  ) => void;
  canUpdate: boolean;
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
              "inline-flex items-center gap-0.5 text-micro px-1.5 py-0.5 rounded-full border font-medium",
              overdue
                ? "bg-status-danger-surface text-status-danger-ink border-status-danger-rule"
                : urgent
                  ? "bg-status-warning-surface text-status-warning-ink border-status-warning-rule"
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
      ? "text-status-success-ink border-status-success-rule bg-status-success-surface"
      : score >= 60
        ? "text-status-warning-ink border-status-warning-rule bg-status-warning-surface"
        : score >= 40
          ? "text-status-warning-ink border-status-warning-rule bg-status-warning-surface"
          : "text-status-danger-ink border-status-danger-rule bg-status-danger-surface";

  return (
    <TooltipProvider>
      <Tooltip onOpenChange={handleTooltipOpenChange}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-micro px-1.5 py-0.5 rounded-full border font-semibold cursor-help",
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
              <p className="text-dense text-muted-foreground">
                No scoring rules matched this lead.
              </p>
            ) : (
              <div className="space-y-1">
                {data.firedRules.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 text-dense"
                  >
                    <span className="truncate">{r.name}</span>
                    <span className="font-semibold text-status-success-ink shrink-0">
                      +{r.points}
                    </span>
                  </div>
                ))}
                <p className="text-micro text-muted-foreground pt-0.5 border-t border-border">
                  {data.firedRules.length} of {data.totalRules} rules matched
                </p>
              </div>
            )
          ) : (
            <p className="text-dense text-muted-foreground">Loading...</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const KanbanCard = memo(function KanbanCard({
  lead,
  index,
  status,
  allStatusKeys,
  onOpen,
  onMoveStatus,
  canUpdate,
}: KanbanCardProps) {
  const selfAssign = useSelfAssignLead();
  const lostIconAnim = useAnimatedIcon();
  const nextIconAnim = useAnimatedIcon();

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
      const keys = allStatusKeys ?? (FALLBACK_STATUSES as readonly string[]);
      const nextIdx = keys.indexOf(status) + 1;
      if (nextIdx > 0 && nextIdx < keys.length - 1)
        onMoveStatus(lead.id, keys[nextIdx] as string, status);
    },
    [lead.id, status, allStatusKeys, onMoveStatus],
  );

  const priorityBorder = lead.priority
    ? (PRIORITY_BORDER[lead.priority] ?? "")
    : "";

  return (
    <Draggable
      key={lead.id}
      draggableId={String(lead.id)}
      index={index}
      isDragDisabled={!canUpdate}
    >
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
                ? "shadow-xl ring-2 ring-primary/30 rotate-[2deg] scale-105"
                : "hover:shadow-md hover:border-primary/30",
            )}
            onClick={handleOpen}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                {canUpdate && (
                  <div
                    {...dragProvided.dragHandleProps}
                    className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <TruncatedText text={lead.name} className="text-sm font-medium" />
                      <p className="text-micro font-mono text-muted-foreground/50 leading-none mt-0.5">
                        LD-{String(lead.id).padStart(5, "0")}
                      </p>
                    </div>
                    {lead.assignedTo ? (
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage
                          src={resolveImageUrl(lead.assignedTo.image)}
                        />
                        <AvatarFallback className="text-micro">
                          {getInitials(lead.assignedTo.name ?? "")}
                        </AvatarFallback>
                      </Avatar>
                    ) : canUpdate ? (
                      <button
                        onClick={handleSelfAssign}
                        className="h-6 w-6 shrink-0 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                        aria-label="Self-assign this lead"
                      >
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ) : null}
                  </div>

                  {lead.company && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 min-w-0">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{lead.company}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {lead.priority && (
                      <span
                        className={cn(
                          "text-micro px-1.5 py-0.5 rounded-full border font-semibold",
                          PRIORITY_CONFIG[lead.priority] ?? PRIORITY_CONFIG["WARM"],
                        )}
                      >
                        {lead.priority}
                      </span>
                    )}
                    {lead.source && (
                      <span
                        className={cn(
                          "text-micro px-1.5 py-0.5 rounded-full border",
                          SOURCE_COLORS[lead.source] || SOURCE_COLORS.other,
                        )}
                      >
                        {lead.source.replace("_", " ")}
                      </span>
                    )}
                    {lead.potentialValue && Number(lead.potentialValue) > 0 && (
                      <span className="text-micro text-primary font-semibold">
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
                      <span className="text-micro text-muted-foreground">
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
                    {canUpdate && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {status !== "CONVERTED" && status !== "LOST" && (
                        <>
                          <button
                            onClick={handleMarkLost}
                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-destructive/10 transition-colors"
                            aria-label="Mark as lost"
                            {...lostIconAnim.hoverHandlers}
                          >
                            <XIcon ref={lostIconAnim.iconRef} className="h-3 w-3 text-destructive" size={12} />
                          </button>
                          <button
                            onClick={handleMoveNext}
                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-primary/20 transition-colors"
                            aria-label="Move to next stage"
                            {...nextIconAnim.hoverHandlers}
                          >
                            <MoveRightIcon ref={nextIconAnim.iconRef} className="h-3 w-3 text-primary" size={12} />
                          </button>
                        </>
                      )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
});
