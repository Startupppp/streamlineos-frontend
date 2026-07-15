import { Skeleton } from "@/components/ui/skeleton";

export function BlogCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="h-8 aspect-[16/9] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-3">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}
