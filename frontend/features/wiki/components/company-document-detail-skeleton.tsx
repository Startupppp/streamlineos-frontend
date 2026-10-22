import { Skeleton } from "@/components/ui/skeleton";

export function CompanyDocumentDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-28 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <Skeleton className="h-4 w-full max-w-prose" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
