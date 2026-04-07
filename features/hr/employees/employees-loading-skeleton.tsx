import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function EmployeesLoadingSkeleton() {
  return (
    <PageWrapper title="Employees" subtitle="Manage your company directory and employee access">
      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-2.5 flex gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-2.5 border-b last:border-0">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36 hidden sm:block" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24 hidden md:block" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2.5 border-t">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-24" />
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
