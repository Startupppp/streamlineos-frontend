import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignDashboardLoading() {
  return (
    <PageWrapper title="SignOS" subtitle="Envelopes, signatures, and completion status at a glance">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </PageWrapper>
  );
}
