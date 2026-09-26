import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SlaReportLoading() {
  return (
    <PageWrapper
      title="SLA Breach Report"
      subtitle="Monthly % of candidates who breached SLA per recruitment stage"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </PageWrapper>
  );
}
