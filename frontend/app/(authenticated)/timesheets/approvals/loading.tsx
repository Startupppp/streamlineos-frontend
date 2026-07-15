import { Skeleton } from "@/components/ui/skeleton";

export default function TimesheetApprovalsLoading() {
  return (
    <div className="px-4 sm:px-6 pt-4 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-40" />
      </div>
      <Skeleton className="h-8 w-64" />
      <div className="rounded-lg border border-border overflow-hidden">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full mt-px" />
        ))}
      </div>
    </div>
  );
}
