import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export function ReportsPageSkeleton() {
  return (
    <PageWrapper
      title="Reports"
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGridSkeleton cols={4} count={4} />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-4">
              <Skeleton className="h-[220px] w-full rounded-md" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <Skeleton className="h-[220px] w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
        <Skeleton className="h-[120px] rounded-lg" />
      </div>
    </PageWrapper>
  );
}
