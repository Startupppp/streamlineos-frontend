import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PayrollRunDetailLoading() {
  return (
    <PageWrapper title="Payroll Run" backHref="/payroll/runs">
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="border border-border rounded-md overflow-hidden">
          <div className="h-10 bg-muted/30 border-b" />
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-8 border-b border-border px-3 flex items-center gap-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="ml-auto h-3 w-20" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
