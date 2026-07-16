import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContingentLoading() {
  return (
    <PageWrapper
      title="Contingent Workforce"
      subtitle="Manage contractor, intern, temporary, and agency engagements."
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}
