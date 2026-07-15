import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PayrollEmployeesLoading() {
  return (
    <PageWrapper title="Salary Profiles" backHref="/payroll">
      <div className="border border-border rounded-md overflow-hidden">
        <div className="bg-muted/40 border-b" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="border-b border-border px-3 flex items-center gap-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="ml-auto h-3 w-24" />
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
