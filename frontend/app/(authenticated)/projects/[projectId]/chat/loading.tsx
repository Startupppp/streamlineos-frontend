import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectChatLoading() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="h-[56px] px-4 border-b flex items-center gap-3 shrink-0">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex-1 px-4 py-3 space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex gap-2 items-end">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <Skeleton className="h-12 w-48 rounded-2xl" />
          </div>
        ))}
      </div>
      <div className="border-t px-4 py-3">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
