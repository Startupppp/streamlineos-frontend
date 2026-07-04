import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PayrollCommandCenterLoading() {
  return (
    <PageWrapper title="Payroll" variant="display">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
