import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function InspectionsLoading() {
  return (
    <PageWrapper
      title="Inspections"
      subtitle="Manage quality inspections"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-56 rounded-md" />
          <Skeleton className="h-8 w-48 rounded-md" />
        </div>
      }
    >
      <div className="space-y-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    </PageWrapper>
  );
}
