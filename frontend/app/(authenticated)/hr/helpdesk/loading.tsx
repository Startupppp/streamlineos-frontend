import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function HrHelpdeskLoading() {
  return (
    <PageWrapper title="HR Helpdesk" subtitle="Submit and track HR support requests">
      <div className="space-y-4">
        <div className="flex gap-1">
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
