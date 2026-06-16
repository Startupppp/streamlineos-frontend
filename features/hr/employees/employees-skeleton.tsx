import { Skeleton } from "@/components/ui/skeleton";

export function EmployeesGridSkeleton({ count = 15 }: { count?: number }) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/70 bg-card p-4 shadow-noir flex flex-col items-center gap-2"
        >
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-3.5 w-24 mt-1" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}
