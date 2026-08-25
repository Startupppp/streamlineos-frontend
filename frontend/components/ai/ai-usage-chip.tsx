"use client";

import { Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCredits, formatTokens, formatUsd } from "@/lib/format-ai";

export interface AiUsageMeta {
  model?: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  credits: number;
  costUsd?: number | null;
}

interface AiUsageChipProps {
  usage?: AiUsageMeta | null;
  className?: string;
}

export function AiUsageChip({ usage, className }: AiUsageChipProps) {
  if (!usage || usage.totalTokens <= 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex shrink-0 cursor-default items-center gap-1 text-dense tabular-nums text-muted-foreground",
            className,
          )}
        >
          <Zap className="h-3 w-3" aria-hidden />
          {usage.credits > 0
            ? `${formatTokens(usage.totalTokens)} tokens · ${formatCredits(usage.credits)} credits`
            : `${formatTokens(usage.totalTokens)} tokens`}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="space-y-0.5">
          {usage.model && <p className="font-medium">{usage.model}</p>}
          <p>
            {formatTokens(usage.promptTokens)} in · {formatTokens(usage.completionTokens)} out
          </p>
          {typeof usage.costUsd === "number" && usage.costUsd > 0 && (
            <p>{formatUsd(usage.costUsd)} provider cost</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
