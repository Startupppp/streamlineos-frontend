import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function RecallsLoading() {
  return (
    <PageWrapper
      title="Recalls"
      subtitle="Manage product recalls"
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
    >
      <div className="space-y-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    </PageWrapper>
  );
}
