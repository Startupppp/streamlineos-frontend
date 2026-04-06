"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Flame,
  Clock,
  Edit2,
  ChevronRight,
  ArrowRightCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AIScoreButton } from "../ai-score-button";
import { AIEmailDialog } from "../ai-email-dialog";
import { fadeUp } from "@/lib/motion-variants";
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
    name: string;
    company?: string | null;
    designation?: string | null;
    status: string;
    priority?: string | null;
    [key: string]: unknown;
  };
  isEditing: boolean;
  onToggleEdit: () => void;
  onStatusChange: (status: PipelineStatus) => void;
}

interface PipelineStepButtonProps {
  status: PipelineStatus;
  index: number;
  isActive: boolean;
  isPast: boolean;
  isLast: boolean;
  onStatusChange: (status: PipelineStatus) => void;
}

function PipelineStepButton({ status, index: i, isActive, isPast, isLast, onStatusChange }: PipelineStepButtonProps) {
  const style = STATUS_STYLES[status];
  const handleClick = useCallback(() => onStatusChange(status), [status, onStatusChange]);
  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
        isActive
          ? cn(style.bg, style.color, "ring-1 ring-current/20")
          : isPast
            ? "bg-muted/50 text-muted-foreground"
            : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30"
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
      {!isLast && <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground/30" />}
    </button>
  );
}

export function LeadDetailHeader({
  lead,
  isEditing,
  onToggleEdit,
  onStatusChange,
}: LeadDetailHeaderProps) {
  const router = useRouter();

  const handleBack = useCallback(() => router.push("/crm/leads"), [router]);
  const handleConvert = useCallback(() => onStatusChange("CONVERTED"), [onStatusChange]);

  const currentStatusIndex = STATUS_PIPELINE.indexOf(
    lead.status as PipelineStatus
  );
  const scoreBadge = getScoreBadge(
    (lead as Record<string, unknown>).score as number | null
  );
  const sla = getSlaCountdown(
    (lead as Record<string, unknown>).slaDeadline as string | null
  );
  const priorityStyle =
    PRIORITY_STYLES[lead.priority ?? "WARM"] ?? PRIORITY_STYLES.WARM;

  return (
    <>
      {/* ── Name / badges / action row ─────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="flex items-center gap-4 flex-wrap"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label="Back to leads"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{lead.name}</h1>
          {lead.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3.5 w-3.5" /> {lead.company}
              {lead.designation && (
                <span className="ml-1">- {lead.designation}</span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className={cn(
              "text-xs px-2 py-0.5",
              scoreBadge.bg,
              scoreBadge.color
            )}
          >
            <Flame className="h-3 w-3 mr-1" />
            Score: {String((lead as Record<string, unknown>).score ?? 0)} (
            {scoreBadge.label})
          </Badge>

          {sla && (
            <Badge className={cn("text-xs px-2 py-0.5", sla.color)}>
              <Clock className="h-3 w-3 mr-1" />
              SLA: {sla.label}
            </Badge>
          )}

          <Badge
            className={cn(
              "text-xs px-2 py-0.5",
              priorityStyle.bg,
              priorityStyle.color
            )}
          >
            {priorityStyle.label}
          </Badge>

          <Badge
            className={cn(
              "text-sm px-3 py-1",
              STATUS_STYLES[lead.status]?.bg,
              STATUS_STYLES[lead.status]?.color
            )}
          >
            {lead.status}
          </Badge>

          <AIScoreButton
            leadId={(lead as Record<string, unknown>).id as number}
            currentScore={(lead as Record<string, unknown>).score as number | null}
            compact
          />

          <AIEmailDialog
            leadName={lead.name}
            company={lead.company}
            designation={lead.designation}
            potentialValue={(lead as Record<string, unknown>).potentialValue as string | undefined}
          />

          <Button variant="outline" size="sm" onClick={onToggleEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>

          {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleConvert}
            >
              <ArrowRightCircle className="h-4 w-4 mr-1" />
              Convert to Deal
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Pipeline stepper ───────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="flex items-center gap-1 p-2 rounded-xl bg-muted/30 border border-border/50 overflow-x-auto"
      >
        {STATUS_PIPELINE.map((status, i) => (
          <PipelineStepButton
            key={status}
            status={status}
            index={i}
            isActive={status === lead.status}
            isPast={i < currentStatusIndex}
            isLast={i === STATUS_PIPELINE.length - 1}
            onStatusChange={onStatusChange}
          />
        ))}
      </motion.div>
    </>
  );
}
