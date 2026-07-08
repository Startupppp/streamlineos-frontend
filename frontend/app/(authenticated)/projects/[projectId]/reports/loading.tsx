import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ReportsLoading() {
  return (
    <PageWrapper
      title="Agile Reports"
      eyebrow="Project"
      subtitle="Velocity, burnup, and cumulative flow for this project"
    >
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </PageWrapper>
  );
}
