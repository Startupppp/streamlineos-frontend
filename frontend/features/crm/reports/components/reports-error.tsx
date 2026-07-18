import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";

interface ReportsErrorProps {
  onRetry: () => void;
}

export function ReportsError({ onRetry }: ReportsErrorProps) {
  return (
    <PageWrapper
      title="Reports"
      subtitle="Sales performance and pipeline analytics"
    >
      <ErrorState
        title="Failed to load report data"
        description="Check your connection and try again."
        onRetry={onRetry}
        className="flex-1 min-h-[50dvh]"
      />
    </PageWrapper>
  );
}
