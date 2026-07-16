import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function EmployeeDetailLoading() {
  return (
    <PageWrapper title="Employee Profile" subtitle="View and edit employee details.">
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="flex items-center gap-3 pt-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </CardContent>
        </Card>

        <Skeleton className="h-10 w-96" />

        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 space-y-3">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
