import { EmptyState } from "@/components/ui/empty-state";

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
    <EmptyState
      bare
      compact={compact}
      illustrationPreset="chart"
      illustrationSize="sm"
      description={message}
      height={compact ? undefined : height}
      className={className}
    />
  );
}
