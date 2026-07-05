import { cn } from "@/lib/utils";
import { IllustrationImage } from "@/components/illustrations/illustration-image";

interface ChartEmptyStateProps {
  message?: string;
  height?: number;
  className?: string;
  compact?: boolean;
}

export function ChartEmptyState({
  message = "No data available",
  height = 280,
  className,
  compact = false,
}: ChartEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        className,
      )}
      style={compact ? undefined : { height }}
    >
      <IllustrationImage
        name="empty-chart"
        className={compact ? "h-20 w-20" : "h-28 w-28"}
      />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
