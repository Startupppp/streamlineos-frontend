import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function OperationsLoading() {
  return (
    <PageWrapper
      title="Operations"
      subtitle="Operational cockpit for daily inventory workflow"
    >
      <div className="space-y-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    </PageWrapper>
  );
}
