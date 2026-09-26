import { Skeleton } from "@/components/ui/skeleton";

const ROW_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export default function ChatLoading() {
  return (
    <div className="flex h-full overflow-hidden bg-background">
      <div className="flex w-full shrink-0 flex-col border-r border-border/40 bg-card/50 lg:w-[340px]">
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="hidden h-9 w-16 rounded-md lg:block" />
          </div>
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="flex gap-1">
            <Skeleton className="h-9 w-12 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-hidden p-2">
          {ROW_KEYS.map((key) => (
            <div key={key} className="flex min-h-14 items-center gap-3 rounded-xl p-2">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-3 lg:flex">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  );
}
