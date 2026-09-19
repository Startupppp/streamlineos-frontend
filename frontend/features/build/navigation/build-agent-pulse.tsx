"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAgentPulse } from "@/hooks/api/build/agent-pulse";
import { BUILD_ROOT_PATH } from "@/lib/build/build-scope";
import type { AgentPulseSignal, AgentPulseSignalType } from "@/hooks/api/build/agent-pulse-schema";

interface BuildAgentPulseProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

function resolveSignalHref(signal: AgentPulseSignal): string {
  const base = BUILD_ROOT_PATH;
  const signalType: AgentPulseSignalType = signal.type;

  const signalTypeToHref: Record<AgentPulseSignalType, string> = {
    "overdue_approval": `${base}/approvals`,
    "blocked_milestone": `${base}/${signal.projectId}/milestones`,
    "delivery_risk": `${base}/${signal.projectId}/risks`,
    "dependency_change": `${base}/${signal.projectId}`,
    "comment_draft": `${base}/drafts`,
  };

  return signalTypeToHref[signalType];
}

function resolveSignalSummary(signal: AgentPulseSignal): string {
  const signalType: AgentPulseSignalType = signal.type;

  const signalTypeToSummary: Record<AgentPulseSignalType, string> = {
    "overdue_approval": `Overdue approval: ${signal.title}`,
    "blocked_milestone": `Milestone overdue: ${signal.title}`,
    "delivery_risk": `High risk: ${signal.title}`,
    "dependency_change": `New blocker on: ${signal.title}`,
    "comment_draft": `Draft awaiting review: ${signal.title}`,
  };

  return signalTypeToSummary[signalType];
}

function CommentDraftTooltipBody({ signal, summary }: { signal: AgentPulseSignal; summary: string }) {
  return (
    <div className="space-y-1">
      <div>{summary}</div>
      {signal.evidence != null && (
        <div className="text-muted-foreground">Evidence: {signal.evidence}</div>
      )}
      {signal.proposedChange != null && (
        <div className="text-muted-foreground">Proposed: {signal.proposedChange}</div>
      )}
      {signal.impact != null && (
        <div className="text-muted-foreground">Impact: {signal.impact}</div>
      )}
      {signal.affectedRecordIds != null && signal.affectedRecordIds.length > 0 && (
        <div className="text-muted-foreground">
          {signal.affectedRecordIds.length} affected record{signal.affectedRecordIds.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

function resolveTooltipContent(signal: AgentPulseSignal, summary: string): React.ReactNode {
  if (signal.type !== "comment_draft") return summary;
  return <CommentDraftTooltipBody signal={signal} summary={summary} />;
}

export function BuildAgentPulse({
  isCollapsed,
  onNavigate,
}: BuildAgentPulseProps) {
  const { data: signal } = useAgentPulse();

  if (!signal) return null;

  const href = resolveSignalHref(signal);
  const summary = resolveSignalSummary(signal);
  const tooltipContent = resolveTooltipContent(signal, summary);

  const showConfidence =
    signal.type === "comment_draft" &&
    signal.confidence != null;

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={summary}
      className={cn(
        "group relative flex items-center gap-2 rounded-md border border-primary/25 bg-primary/5 transition-colors hover:bg-primary/10 motion-reduce:transition-none",
        isCollapsed ? "mx-auto h-8 w-8 justify-center" : "px-2 py-1.5",
      )}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
      {isCollapsed ? null : (
        <>
          <span className="min-w-0 flex-1 truncate text-micro font-medium text-foreground">
            {summary}
          </span>
          {showConfidence && (
            <span className="shrink-0 rounded px-1 py-0.5 text-micro font-bold tabular-nums bg-primary/10 text-primary">
              {signal.confidence}%
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (!isCollapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-xs font-medium max-w-[220px]">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
