import { Skeleton } from "@/components/ui/skeleton";

export default function SignEnvelopeBuilderLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-64 shrink-0 border-r border-border flex flex-col overflow-hidden">
          <div className="p-3 space-y-2">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="flex-1 p-3 space-y-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0 bg-muted/30 flex items-center justify-center">
          <Skeleton className="h-[70%] w-[55%] rounded-lg" />
        </div>
        <div className="w-72 shrink-0 border-l border-border p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
