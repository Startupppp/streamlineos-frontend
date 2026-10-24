import { Skeleton } from "@/components/ui/skeleton";
import { WikiFillTable } from "./wiki-collection-skeletons";

export function KbSharingSettingsSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-9 w-full rounded-md sm:w-28" />
        </div>
        <div className="space-y-4 px-4 py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
          <div className="divide-y divide-border rounded-lg border border-border">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="flex items-start gap-3 px-3 py-3">
                <Skeleton className="mt-0.5 size-4 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="space-y-1.5 border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <div className="p-4 pt-3">
          <WikiFillTable
            headers={["Page", "Type", "Recipient / Created by", "Status", "Expires"]}
          />
        </div>
      </div>
    </div>
  );
}
