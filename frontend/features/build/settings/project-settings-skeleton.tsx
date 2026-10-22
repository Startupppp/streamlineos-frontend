import { Skeleton } from "@/components/ui/skeleton";

export function ProjectSettingsPanelSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className={tall ? "h-48 w-full rounded-xl" : "h-24 w-full rounded-xl"} />
    </div>
  );
}
