import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function LearningAnalyticsLoading() {
  return (
    <PageWrapper
      title="Learning Analytics"
      subtitle="Track your learning progress and course completion"
      actions={<Skeleton className="h-8 w-40 rounded-md" />}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card
              key={i}
              className="bg-card/90 backdrop-blur-sm rounded-2xl border border-border shadow-xl overflow-hidden"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-2.5 w-20 mb-3" />
                    <Skeleton className="h-8 w-14" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="bg-card/90 backdrop-blur-sm rounded-2xl border border-border shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-[200px] w-full rounded-xl" />
            </CardContent>
          </Card>

          <Card className="bg-card/90 backdrop-blur-sm rounded-2xl border border-border shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-5 w-7 rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
