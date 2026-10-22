import { Skeleton } from "@/components/ui/skeleton";

export function RetentionSettingsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
