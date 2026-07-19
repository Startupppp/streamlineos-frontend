import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensesLoading() {
  return (
    <PageWrapper
      title="Expense Approvals"
      subtitle="Review and manage pending employee expense claims."
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[88px] rounded-md" />
          <Skeleton className="h-9 w-[88px] rounded-md" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} count={4} />

        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-[100px] rounded-full" />
            <Skeleton className="h-8 w-[88px] rounded-full" />
            <Skeleton className="h-8 w-[92px] rounded-full" />
            <Skeleton className="h-8 w-[88px] rounded-full" />
          </div>
          <Skeleton className="h-9 w-[180px] rounded-md" />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-4 py-4 border-l-4 border-l-border">
                <div className="flex-shrink-0">
                  <Skeleton className="w-[96px] h-[76px] rounded-xl" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="hidden lg:block min-w-[130px] flex-shrink-0 text-right space-y-2">
                  <Skeleton className="h-3 w-16 ml-auto" />
                  <div className="flex items-center gap-1.5 justify-end">
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="min-w-[160px] flex-shrink-0 text-right space-y-1">
                  <Skeleton className="h-3 w-14 ml-auto" />
                  <Skeleton className="h-6 w-28 ml-auto" />
                  <Skeleton className="h-3 w-8 ml-auto" />
                  <div className="flex justify-end gap-1.5 mt-3">
                    <Skeleton className="h-8 w-[70px] rounded-md" />
                    <Skeleton className="h-8 w-[80px] rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
