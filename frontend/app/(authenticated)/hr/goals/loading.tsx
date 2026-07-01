import { Skeleton } from "@/components/ui/skeleton";

export default function GoalsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/90 rounded-2xl border border-slate-200/80 p-5 space-y-4"
          >
            <div className="flex gap-4 items-start">
              <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
