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
import { useCrmOptions } from "@/hooks/api/crm/metadata";
import type { CrmOptionType } from "@/types/crm/metadata";

const ALL_SENTINEL = "all";

interface CrmOptionSelectProps {
  type: CrmOptionType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowAll?: boolean;
  className?: string;
}

export function CrmOptionSelect({
  type,
  value,
  onChange,
  placeholder = "Select…",
  allowAll = false,
  className,
}: CrmOptionSelectProps) {
  const { data: options = [] } = useCrmOptions(type);

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
        {options.map((option) => {
          const { dotClass } = getCrmTokenClasses(option.color ?? "");
          return (
            <SelectItem key={option.id} value={option.key} className="text-xs">
              <span className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full shrink-0", dotClass)} />
                {option.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
