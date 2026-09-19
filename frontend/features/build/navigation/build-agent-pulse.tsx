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

export function BuildAgentPulse({
  isCollapsed,
  onNavigate,
}: BuildAgentPulseProps) {
  const { data: signal } = useAgentPulse();

  if (!signal) return null;

  const href = resolveSignalHref(signal);
  const summary = resolveSignalSummary(signal);

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={summary}
      className={cn(
        "group relative flex items-center gap-2 rounded-md border border-primary/25 bg-primary/5 transition-colors hover:bg-primary/10",
        isCollapsed ? "mx-auto h-8 w-8 justify-center" : "px-2 py-1.5",
      )}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
      {isCollapsed ? null : (
        <span className="min-w-0 flex-1 truncate text-micro font-medium text-foreground">
          {summary}
        </span>
      )}
    </Link>
  );

  if (!isCollapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
        {summary}
      </TooltipContent>
    </Tooltip>
  );
}
