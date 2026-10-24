import { Skeleton } from "@/components/ui/skeleton";

const BULK_SEND_ROW_PLACEHOLDERS = 6;

export function BulkSendListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: BULK_SEND_ROW_PLACEHOLDERS }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36 max-w-full" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}
