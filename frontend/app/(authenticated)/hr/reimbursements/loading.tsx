import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReimbursementsLoading() {
  return (
    <PageWrapper
      title="Reimbursements"
      subtitle="Submit and track reimbursement requests"
      actions={<Skeleton className="h-9 w-[120px] rounded-md" />}
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24 ml-auto" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
