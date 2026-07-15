import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PayrollInputsLoading() {
  return (
    <PageWrapper title="Attendance Inputs" backHref="/payroll">
      <div className="border border-border rounded-md overflow-hidden">
        <div className="h-8 bg-muted/40 border-b" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-8 border-b border-border px-3 flex items-center gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-16 rounded" />
            {Array.from({ length: 12 }).map((_, j) => (
              <Skeleton key={j} className="h-3 w-10" />
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
