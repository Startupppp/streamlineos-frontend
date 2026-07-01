import { Skeleton } from "@/components/ui/skeleton";

export default function AuditLogLoading() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Skeleton className="h-7 w-32 mb-6" />
      <div className="bg-white/90 rounded-2xl border border-slate-200/80 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 py-3 px-4 border-b border-slate-100"
          >
            <Skeleton className="h-7 w-7 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
