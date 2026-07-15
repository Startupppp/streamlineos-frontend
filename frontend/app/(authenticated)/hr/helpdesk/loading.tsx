import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function HrHelpdeskLoading() {
  return (
    <PageWrapper title="HR Helpdesk" subtitle="Submit and track HR support requests">
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}
