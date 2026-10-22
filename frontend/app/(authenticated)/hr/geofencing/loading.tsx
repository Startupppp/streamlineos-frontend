import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function GeofencingLoading() {
  return (
    <PageWrapper
      title="Geofencing"
      subtitle="Define office location boundaries for attendance validation"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-20 rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
