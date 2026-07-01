import { Skeleton } from "@/components/ui/skeleton";

export default function PerformanceAnalyticsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/90 rounded-2xl border border-slate-200/80 p-5 animate-pulse space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/90 rounded-2xl border border-slate-200/80 p-6 space-y-4 animate-pulse">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
        <div className="bg-white/90 rounded-2xl border border-slate-200/80 p-6 space-y-4 animate-pulse">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
      </div>
      <div className="bg-white/90 rounded-2xl border border-slate-200/80 overflow-hidden animate-pulse">
        <div className="px-6 py-4 border-b border-slate-100">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-6">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
