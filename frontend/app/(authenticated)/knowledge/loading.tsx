import { Skeleton } from "@/components/ui/skeleton";

export default function KnowledgeBaseLoading() {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="hidden md:block w-[260px] shrink-0 border-r border-border bg-card/50 p-4">
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-7 rounded-md"
              style={{ width: `${60 + (i % 3) * 15}%` }}
            />
          ))}
        </div>
      </div>
      <div className="flex-1 p-8 space-y-6">
        <Skeleton className="h-8 w-48 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
