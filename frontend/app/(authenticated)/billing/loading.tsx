import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export default function BillingLoading() {
  return (
    <PageWrapper
      title="Billing & Finance"
      subtitle="Track invoices, payments, and revenue"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={5} />
        <div className="flex-1 min-h-0 rounded-xl border border-border bg-card">
          <div className="space-y-3 p-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
