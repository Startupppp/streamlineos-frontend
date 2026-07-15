import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";

export function PayrollPageSkeleton() {
  return (
    <PageWrapper
      title="Payroll"
      eyebrow="Timesheets"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      }
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-lg" />
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-3 py-2 flex gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-3 flex-1" />
              ))}
            </div>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex gap-2 px-3 py-2 border-b last:border-0">
                {Array.from({ length: 10 }).map((_, j) => (
                  <Skeleton key={j} className="h-3 flex-1" />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
