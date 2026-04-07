import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function TeamTimesheetsLoading() {
  return (
    <PageWrapper title="Team Timesheets" subtitle="Review your team's logged hours.">
      <div className="space-y-6">
        {/* Action button */}
        <div className="flex items-center justify-end">
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Month nav + filter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-9 w-9 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Calendar heatmap */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={`h-${i}`} className="h-4 w-full" />
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team table */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
