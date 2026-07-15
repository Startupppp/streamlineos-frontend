import { Skeleton } from "@/components/ui/skeleton";

export default function WorkforceCostLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
