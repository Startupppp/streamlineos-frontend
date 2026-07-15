import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function LoansPageSkeleton() {
  return (
    <PageWrapper title="Loans & Advances" eyebrow="Payroll" subtitle="Loading…">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-8 w-44 rounded-md" />
      </div>
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
          <div className="border-b border-border px-2 py-1.5">
            <Skeleton className="h-3 w-24" />
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-2 py-1.5 border-b border-border last:border-0">
              <div className="flex flex-col gap-1 flex-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
              <div className="flex flex-col gap-1 w-24">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

export default function Loading() {
  return <LoansPageSkeleton />;
}
