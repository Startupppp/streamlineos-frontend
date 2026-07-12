import { Skeleton } from "@/components/ui/skeleton";

export default function TerritoriesLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
