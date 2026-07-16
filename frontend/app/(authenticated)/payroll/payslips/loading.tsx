import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PayslipsLoading() {
  return (
    <PageWrapper title="Payslips" subtitle="Manage payslip templates and publish to employees.">
      <div className="flex flex-col gap-4">
        <div className="flex gap-1 border-b border-border pb-0">
          <Skeleton className="h-9 w-32 rounded-t-md" />
          <Skeleton className="h-9 w-28 rounded-t-md" />
        </div>
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
            <Skeleton className="h-9 w-48 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-20 ml-auto" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
