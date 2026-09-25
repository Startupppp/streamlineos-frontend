import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SlaLoading() {
  return (
    <PageWrapper
      title="SLA Configuration"
      subtitle="Set maximum hours allowed per recruitment stage before an SLA breach is triggered"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-4 border-b">
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-32 flex-shrink-0" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <div className="ml-auto">
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
