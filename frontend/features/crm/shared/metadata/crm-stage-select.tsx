"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getCrmTokenClasses } from "./crm-color-tokens";
import { useCrmStages } from "@/hooks/api/crm/metadata";

const ALL_SENTINEL = "all";

interface CrmStageSelectProps {
  pipelineIdOrType: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowAll?: boolean;
  className?: string;
}

export function CrmStageSelect({
  pipelineIdOrType,
  value,
  onChange,
  placeholder = "Select stage…",
  allowAll = false,
  className,
}: CrmStageSelectProps) {
  const { data: stages = [] } = useCrmStages(pipelineIdOrType);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("text-xs", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && (
          <SelectItem value={ALL_SENTINEL} className="text-xs">
            All
          </SelectItem>
        )}
        {stages.map((stage) => {
          const { dotClass } = getCrmTokenClasses(stage.color ?? "");
          return (
            <SelectItem key={stage.id} value={stage.key} className="text-xs">
              <span className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full shrink-0", dotClass)} />
                {stage.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
