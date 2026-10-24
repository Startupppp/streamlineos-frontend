import { Skeleton } from "@/components/ui/skeleton";

const BULK_SEND_ROW_PLACEHOLDERS = 6;

export function BulkSendListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: BULK_SEND_ROW_PLACEHOLDERS }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-36 max-w-full" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}
