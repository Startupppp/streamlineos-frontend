import { Skeleton } from "@/components/ui/skeleton";

export function WikiTableRowsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

export function WikiTemplatesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 12 }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}
