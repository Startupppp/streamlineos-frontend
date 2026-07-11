import { Skeleton } from "@/components/ui/skeleton";

export default function WorkflowSettingsLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
      <div className="space-y-2 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
