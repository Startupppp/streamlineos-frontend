import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShiftsLoading() {
  return (
    <PageWrapper
      title="Shifts"
      subtitle="Manage shift templates, employee assignments, and swap requests"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <div className="flex gap-1">
          <Skeleton className="h-7 w-32 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-md" />
          <Skeleton className="h-7 w-32 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
