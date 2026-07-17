import { Skeleton } from "@/components/ui/skeleton";

export default function BuilderLoading() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-3 py-3 border-b border-border space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex-1 min-h-0 p-2 space-y-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 shrink-0 bg-card border-b border-border flex items-center px-3 gap-3">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <div className="w-px h-4 bg-border" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        </div>

        <div className="flex-1 min-h-0 flex">
          <Skeleton className="flex-1 rounded-none" />
        </div>
      </div>
    </div>
  );
}
