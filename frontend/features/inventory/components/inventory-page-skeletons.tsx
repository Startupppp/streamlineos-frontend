import { Skeleton } from "@/components/ui/skeleton";

export function DetailActionSkeleton() {
  return (
    <div className="flex gap-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

export function ListActionSkeleton() {
  return <Skeleton className="h-8 w-20" />;
}

export function ListFilterSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === 0 ? "h-8 flex-1 max-w-md" : "h-8 w-36"}
        />
      ))}
    </div>
  );
}

export function InventoryTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="h-10 bg-muted/30 border-b border-border flex items-center px-4 gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20 hidden sm:block" />
        <Skeleton className="h-3 w-16 hidden md:block" />
        <Skeleton className="h-3 w-16 hidden lg:block" />
        <Skeleton className="h-3 w-14 hidden lg:block" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 border-t border-border flex items-center px-4 gap-3"
        >
          <Skeleton className="h-3 w-32 flex-1" />
          <Skeleton className="h-3 w-20 hidden sm:block" />
          <Skeleton className="h-3 w-16 hidden md:block" />
          <Skeleton className="h-3 w-16 hidden lg:block" />
          <Skeleton className="h-5 w-14 rounded-full hidden lg:block" />
        </div>
      ))}
    </div>
  );
}
