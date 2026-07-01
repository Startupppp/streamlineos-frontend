import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="w-px flex-1 bg-border/30 mt-1" />
            </div>
            <div className="flex-1 pb-4">
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
