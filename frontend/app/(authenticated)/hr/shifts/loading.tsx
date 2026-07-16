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
        <Skeleton className="h-9 w-80 rounded-md" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
