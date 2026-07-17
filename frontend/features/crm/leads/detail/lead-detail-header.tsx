"use client";

import { useCallback } from "react";
import {
  Building2,
  Flame,
  Clock,
  Edit2,
  ArrowRightCircle,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { AIScoreButton } from "../ai-score-button";
import { AIEmailDialog } from "../ai-email-dialog";
import { AINextActionButton } from "../ai-next-action-button";
import { AIEnrichLeadButton } from "../ai-enrich-lead-button";
import {
  STATUS_PIPELINE,
  STATUS_STYLES,
  PRIORITY_STYLES,
  getScoreBadge,
  getSlaCountdown,
  type PipelineStatus,
} from "./lead-types";

interface LeadDetailHeaderProps {
  lead: {
    id: number;
    name: string;
    company?: string | null;
    designation?: string | null;
    status: string;
    priority?: string | null;
    score?: number | null;
    slaDeadline?: string | null;
    potentialValue?: string | null;
    email?: string | null;
    city?: string | null;
  };
  isEditing: boolean;
  isStatusPending?: boolean;
  onToggleEdit: () => void;
  onStatusChange: (status: PipelineStatus) => void;
}

interface PipelineStepProps {
  status: PipelineStatus;
  isActive: boolean;
  isPast: boolean;
  isLast: boolean;
  isPending: boolean;
  onStatusChange: (status: PipelineStatus) => void;
}

const STATUS_LABELS: Record<PipelineStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
  LOST: "Lost",
};

function PipelineStep({
  status,
  isActive,
  isPast,
  isLast,
  isPending,
  onStatusChange,
}: PipelineStepProps) {
  const handleClick = useCallback(
    () => onStatusChange(status),
    [status, onStatusChange]
  );

  const isLost = status === "LOST";

  return (
    <div className="flex items-center flex-1 min-w-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || isActive}
        className="flex flex-col items-center gap-1.5 group shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Move to ${STATUS_LABELS[status]}`}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full transition-all duration-200",
            isActive
              ? cn(
                  "h-5 w-5 border-2 border-primary bg-primary/20",
                  isLost && "border-red-400 bg-red-500/20"
                )
              : isPast
                ? cn("h-3 w-3", isLost ? "bg-red-400" : "bg-primary")
                : "h-3 w-3 rounded-full border border-border bg-background group-hover:border-muted-foreground"
          )}
        >
          {isActive && (
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isLost ? "bg-red-400" : "bg-primary"
              )}
            />
          )}
        </div>
        <span
          className={cn(
            "text-[10px] font-medium whitespace-nowrap leading-none",
            isActive
              ? isLost
                ? "text-red-400"
                : "text-primary"
              : isPast
                ? "text-muted-foreground"
                : "text-muted-foreground/40 group-hover:text-muted-foreground/70"
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </button>

      {!isLast && (
        <div
          className={cn(
            "flex-1 h-px mx-2 mb-3.5",
            isPast ? "bg-primary/50" : "bg-border/50"
          )}
        />
      )}
    </div>
  );
}

export function LeadDetailHeader({
  lead,
  isEditing,
  isStatusPending = false,
  onToggleEdit,
  onStatusChange,
}: LeadDetailHeaderProps) {
  const handleConvert = useCallback(
    () => onStatusChange("CONVERTED"),
    [onStatusChange]
  );

  const currentStatusIndex = STATUS_PIPELINE.indexOf(
    lead.status as PipelineStatus
  );
  const scoreBadge = getScoreBadge(lead.score ?? null);
  const sla = getSlaCountdown(lead.slaDeadline ?? null);
  const priorityStyle =
    PRIORITY_STYLES[lead.priority ?? "WARM"] ?? PRIORITY_STYLES.WARM;

  const initials = lead.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-4 pb-3">
          <div className="flex items-start gap-3 sm:contents">
          <div className="shrink-0 h-12 w-12 rounded-full ring-2 ring-primary/50 bg-primary/10 flex items-center justify-center text-primary font-bold text-lg select-none">
            {initials || "?"}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-baseline gap-2">
              <TruncatedText text={lead.name} className="text-xl font-bold leading-tight" />
              <span className="text-xs font-mono text-muted-foreground/60 shrink-0">
                LD-{String(lead.id).padStart(5, "0")}
              </span>
            </div>
            {(lead.company || lead.designation) && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap min-w-0">
                {lead.company && (
                  <span className="flex items-center gap-1 min-w-0">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{lead.company}</span>
                  </span>
                )}
                {lead.company && lead.designation && (
                  <span className="text-muted-foreground/40 shrink-0">·</span>
                )}
                {lead.designation && (
                  <span className="flex items-center gap-1 min-w-0">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{lead.designation}</span>
                  </span>
                )}
              </p>
            )}
          </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2 py-0.5 font-semibold",
                  priorityStyle.bg,
                  priorityStyle.color
                )}
              >
                {priorityStyle.label}
              </Badge>

              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2 py-0.5 font-semibold",
                  STATUS_STYLES[lead.status]?.bg,
                  STATUS_STYLES[lead.status]?.color
                )}
              >
                {lead.status}
              </Badge>

              <Badge
                variant="outline"
                className={cn("text-xs px-2 py-0.5 font-semibold", scoreBadge.bg, scoreBadge.color)}
              >
                <Flame className="h-3 w-3 mr-1" />
                {String(lead.score ?? 0)}{" "}
                · {scoreBadge.label}
              </Badge>

              {sla && (
                <Badge variant="outline" className={cn("text-xs px-2 py-0.5 font-semibold", sla.color)}>
                  <Clock className="h-3 w-3 mr-1" />
                  {sla.label}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 flex-wrap sm:justify-end">
              <AIScoreButton
                leadId={lead.id}
                currentScore={lead.score ?? null}
                compact
              />
              <AIEmailDialog
                leadName={lead.name}
                company={lead.company}
                designation={lead.designation}
                potentialValue={lead.potentialValue ?? undefined}
              />
              <AINextActionButton
                leadId={lead.id}
                compact
              />
              <AIEnrichLeadButton
                leadName={lead.name}
                company={lead.company}
                email={lead.email}
                designation={lead.designation}
                city={lead.city}
              />

              <Button variant="outline" size="sm" onClick={onToggleEdit}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>

              {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleConvert}
                  disabled={isStatusPending}
                >
                  <ArrowRightCircle className="h-3.5 w-3.5 mr-1" />
                  {isStatusPending ? "Updating..." : "Convert"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 pt-1">
          <div className="flex flex-wrap items-start gap-2 px-2 py-2.5 rounded-md bg-muted/30 border border-border">
            {STATUS_PIPELINE.map((status, i) => (
              <PipelineStep
                key={status}
                status={status}
                isActive={status === lead.status}
                isPast={i < currentStatusIndex}
                isLast={i === STATUS_PIPELINE.length - 1}
                isPending={isStatusPending}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
