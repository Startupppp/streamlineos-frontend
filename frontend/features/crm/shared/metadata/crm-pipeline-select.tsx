"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCrmPipelines } from "@/hooks/api/crm/metadata";
import type { CrmPipelineType } from "@/types/crm/metadata";

const ALL_SENTINEL = "all";

interface CrmPipelineSelectProps {
  value: string;
  onChange: (value: string) => void;
  filterType?: CrmPipelineType;
  placeholder?: string;
  allowAll?: boolean;
  className?: string;
}

export function CrmPipelineSelect({
  value,
  onChange,
  filterType,
  placeholder = "Select pipeline…",
  allowAll = false,
  className,
}: CrmPipelineSelectProps) {
  const { data: pipelines = [] } = useCrmPipelines(filterType);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-8 text-xs", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && (
          <SelectItem value={ALL_SENTINEL} className="text-xs">
            All
          </SelectItem>
        )}
        {pipelines.map((pipeline) => (
          <SelectItem key={pipeline.id} value={pipeline.id} className="text-xs">
            {pipeline.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
