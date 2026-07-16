import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function TerritoriesLoading() {
  return (
    <PageWrapper
      title="Territories"
      subtitle="Geographic and segmentation territories for lead and deal routing"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="flex-1 min-h-0 flex flex-col space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-border px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <div className="flex gap-1">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
