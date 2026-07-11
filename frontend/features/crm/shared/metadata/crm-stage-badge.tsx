"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCrmTokenClasses } from "./crm-color-tokens";
import type { CrmPipelineStage } from "@/types/crm/metadata";

interface CrmStageBadgeProps {
  stage: CrmPipelineStage | { key: string; label: string; color: string };
  size?: "table" | "card";
  showProbability?: boolean;
  className?: string;
}

export function CrmStageBadge({
  stage,
  size = "table",
  showProbability = false,
  className,
}: CrmStageBadgeProps) {
  const { badgeClass } = getCrmTokenClasses(stage.color);
  const probability = "probability" in stage ? stage.probability : undefined;

  return (
    <Badge
      variant="outline"
      className={cn(
        badgeClass,
        size === "table" ? "h-4 text-[9px] px-1.5 py-0" : "h-5 text-[10px] px-2 py-0.5",
        className
      )}
    >
      {stage.label}
      {showProbability && probability !== undefined && (
        <span className="ml-0.5 opacity-70">{probability}%</span>
      )}
    </Badge>
  );
}
