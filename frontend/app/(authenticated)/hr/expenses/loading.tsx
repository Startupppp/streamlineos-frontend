import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensesLoading() {
  return (
    <PageWrapper
      title="Expense Approvals"
      subtitle="Review and manage pending employee expense claims"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[88px] rounded-md" />
          <Skeleton className="h-9 w-[100px] rounded-md" />
          <Skeleton className="h-9 w-[108px] rounded-md" />
        </div>
      }
    >
      <div className="space-y-5">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
