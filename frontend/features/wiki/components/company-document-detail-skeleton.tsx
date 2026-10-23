import { Skeleton } from "@/components/ui/skeleton";

export function CompanyDocumentDetailSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex shrink-0 gap-2">
        <Skeleton className="h-5 w-28 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <div className="grid shrink-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(1rem,1fr)] gap-3 overflow-hidden">
        {Array.from({ length: 48 }, (_, index) => (
          <Skeleton key={index} className={index % 5 === 4 ? "h-4 w-2/3" : "h-4 w-full"} />
        ))}
      </div>
    </div>
  );
}
