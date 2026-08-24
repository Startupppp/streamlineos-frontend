import { cn } from "@/lib/utils";
import { resolveColumnColor } from "@/lib/column-colors";
import type { StatusConfigEntry } from "@/lib/status-config";

interface StatusConfigDotProps {
  entry: StatusConfigEntry;
  className?: string;
}

export function StatusConfigDot({
  entry,
  className = "h-2 w-2 shrink-0 rounded-full",
}: StatusConfigDotProps) {
  if (entry.color) {
    return (
      <span
        className={className}
        style={{ backgroundColor: resolveColumnColor(entry.color) }}
        aria-hidden="true"
      />
    );
  }
  return <span className={cn(className, entry.dotColor)} aria-hidden="true" />;
}
