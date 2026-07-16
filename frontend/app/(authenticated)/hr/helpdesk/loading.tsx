import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function HrHelpdeskLoading() {
  return (
    <PageWrapper title="HR Helpdesk" subtitle="Submit and track HR support requests">
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <Skeleton className="h-9 w-48 rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
