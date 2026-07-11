"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCrmTokenClasses } from "./crm-color-tokens";
import type { CrmOption } from "@/types/crm/metadata";

interface CrmOptionBadgeProps {
  option: CrmOption | { key: string; label: string; color: string };
  size?: "table" | "card";
  className?: string;
}

export function CrmOptionBadge({ option, size = "table", className }: CrmOptionBadgeProps) {
  const { badgeClass } = getCrmTokenClasses(option.color);

  return (
    <Badge
      variant="outline"
      className={cn(
        badgeClass,
        size === "table" ? "h-4 text-[9px] px-1.5 py-0" : "h-5 text-[10px] px-2 py-0.5",
        className
      )}
    >
      {option.label}
    </Badge>
  );
}
