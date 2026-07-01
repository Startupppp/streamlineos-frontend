import { Skeleton } from "@/components/ui/skeleton";

export default function AutomationsLoading() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-40 rounded-xl" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}
