import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";

interface ReportsErrorProps {
  onRetry: () => void;
}

export function ReportsError({ onRetry }: ReportsErrorProps) {
  return (
    <PageWrapper
      title="Reports"
      subtitle="Sales performance and pipeline analytics"
    >
      <div className="flex flex-1 h-full flex-col items-center justify-center gap-3 text-center py-16">
        <AlertTriangle className="h-10 w-10 text-destructive/60" />
        <p className="text-sm font-medium">Failed to load report data</p>
        <p className="text-xs text-muted-foreground">
          Check your connection and try again.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </PageWrapper>
  );
}
