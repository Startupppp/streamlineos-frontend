"use client";

import { useEffectiveChanges, useEmployeeEmployment } from "@/hooks/api/hr/employees";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  userId: string;
  changeType?: string;
}

export function EffectiveChangeBadge({ userId, changeType }: Props) {
  const { data: employment } = useEmployeeEmployment(userId);
  const { data: changes } = useEffectiveChanges(
    employment?.id ? { employmentId: employment.id } : undefined
  );

  const pending = (changes?.data ?? []).filter(
    (c) => c.status === "PENDING" && (!changeType || c.changeType === changeType)
  );

  if (pending.length === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="h-5 gap-1 border-amber-300 bg-amber-50 text-amber-700 text-[10px] dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700">
          <Clock className="h-2.5 w-2.5" />
          {pending.length} pending
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {pending.length} pending change{pending.length !== 1 ? "s" : ""} awaiting approval
      </TooltipContent>
    </Tooltip>
  );
}
