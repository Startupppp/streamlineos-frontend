import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PayrollRunsLoading() {
  return (
    <PageWrapper title="Payroll Runs" backHref="/payroll">
      <div className="border border-border rounded-md overflow-hidden">
        <div className="h-8 bg-muted/40 border-b" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 border-b border-border px-3 flex items-center gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="ml-auto h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
