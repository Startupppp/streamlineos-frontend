import { Skeleton } from "@/components/ui/skeleton";

export default function MailLoading() {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 bg-background">
      <div className="hidden md:flex flex-col shrink-0 w-[260px] border-r border-border/40 bg-card/50">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 shrink-0">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>

        <div className="px-3 py-2 border-b border-border/40 shrink-0">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>

        <div className="flex flex-col gap-0.5 px-2 py-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>

        <div className="flex flex-col gap-0 mt-2 overflow-hidden flex-1 min-h-0">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-3 py-2.5 border-b border-border/20">
              <div className="flex items-start justify-between gap-2 mb-1">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3 w-10 rounded shrink-0" />
              </div>
              <Skeleton className="h-3.5 w-full rounded mb-1" />
              <Skeleton className="h-3 w-4/5 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 min-w-0 items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2 text-center">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-3 w-48 rounded" />
        </div>
      </div>
    </div>
  );
}
