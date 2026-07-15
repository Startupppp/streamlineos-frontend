import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function PerformanceAnalyticsLoading() {
  return (
    <PageWrapper title="Performance Analytics" subtitle="Insights across reviews, ratings, and goals">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="bg-card border border-border rounded-xl shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border border-border rounded-xl shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-52 w-full rounded-lg" />
            </CardContent>
          </Card>
          <Card className="bg-card border border-border rounded-xl shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-52 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
        <Card className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex gap-6">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
