import { Skeleton } from "@/components/ui/skeleton";
import { WikiFillTable } from "./wiki-collection-skeletons";

export function KbSharingSettingsSkeleton() {
  return (
    <div className="flex min-h-0 w-full max-w-lg flex-1 flex-col gap-6">
      <div className="flex shrink-0 flex-col gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-4 w-52" />
          </div>
        ))}
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Skeleton className="h-4 w-36 shrink-0" />
        <WikiFillTable headers={["Page", "Type", "Recipient / Created by", "Status", "Expires"]} />
      </div>
    </div>
  );
}
