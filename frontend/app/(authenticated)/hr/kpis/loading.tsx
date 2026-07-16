import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function KpisLoading() {
  return (
    <PageWrapper
      title="KPIs & Competencies"
      subtitle="Define performance indicators and competency frameworks"
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <Skeleton className="h-9 w-64 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
