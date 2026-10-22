import { Building2 } from "lucide-react";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { cn } from "@/lib/utils";

const SOURCES = {
  "hr-document": { label: "HR document", icon: Building2 },
} as const;

export type SourceBadgeKind = keyof typeof SOURCES;

interface SourceBadgeProps {
  kind: SourceBadgeKind;
  size?: "xs" | "sm";
  className?: string;
}

export function SourceBadge({ kind, size = "xs", className }: SourceBadgeProps) {
  const source = SOURCES[kind];
  const Icon = source.icon;
  return (
    <SemanticBadge
      tone="neutral"
      size={size}
      className={cn("whitespace-nowrap", className)}
      icon={<Icon className="h-3 w-3" aria-hidden="true" />}
      label={source.label}
    />
  );
}
