import { Skeleton } from "@/components/ui/skeleton";

export default function WebhooksLoading() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-3">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}
