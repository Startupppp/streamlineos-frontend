import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <PageWrapper
      title="Reports & Exports"
      subtitle="Build custom reports and export recruitment data"
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    </PageWrapper>
  );
}
