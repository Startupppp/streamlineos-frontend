import { Skeleton } from "@/components/ui/skeleton";

export default function BudgetLoading() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
