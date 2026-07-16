import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaveAnalyticsLoading() {
  return (
    <PageWrapper
      title="Leave Analytics"
      subtitle="Summary from the HR Analytics module"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
