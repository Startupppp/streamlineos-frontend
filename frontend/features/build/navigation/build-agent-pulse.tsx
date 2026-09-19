"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApprovalInbox } from "@/hooks/api/build/approvals";
import { BUILD_ROOT_PATH } from "@/lib/build/build-scope";

const PULSE_HREF = `${BUILD_ROOT_PATH}/approvals`;

interface BuildAgentPulseProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

export function BuildAgentPulse({
  isCollapsed,
  onNavigate,
}: BuildAgentPulseProps) {
  const { data: inbox } = useApprovalInbox();
  const pending = inbox?.length ?? 0;

  if (pending === 0) return null;

  const summary =
    pending === 1
      ? "1 approval is waiting on you"
      : `${pending} approvals are waiting on you`;

  const link = (
    <Link
      href={PULSE_HREF}
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
