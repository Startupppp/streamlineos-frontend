import { Building2 } from "lucide-react";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { cn } from "@/lib/utils";

/**
 * Where a knowledge-base entry really comes from. A wiki page is written in the knowledge base; an entry marked
 * with a source badge is a POINTER at something another module owns, so opening it leaves the wiki and the
 * source can change or disappear independently. Add a kind here when a new source starts linking in, so every
 * list and header says the same thing about the same source.
 */
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
