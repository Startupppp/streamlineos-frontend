import { Skeleton } from "@/components/ui/skeleton";

export function PageHistorySkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 md:flex-row">
      <div className="flex h-56 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card md:h-full md:w-72 lg:w-80">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-[minmax(3.5rem,1fr)] gap-2 overflow-hidden p-3">
          {Array.from({ length: 18 }, (_, index) => (
            <Skeleton key={index} className="h-full min-h-0 w-full rounded-md" />
          ))}
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-5 w-36 shrink-0" />
        <div className="grid min-h-0 flex-1 auto-rows-[1rem] content-start gap-3 overflow-hidden">
          {Array.from({ length: 48 }, (_, index) => (
            <Skeleton key={index} className={index % 4 === 3 ? "h-4 w-3/5" : "h-4 w-full"} />
          ))}
        </div>
      </div>
    </div>
  );
}
