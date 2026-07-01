import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function TrainingLoading() {
  return (
    <PageWrapper
      title="Training Programs"
      subtitle="Manage sessions, track attendance and feedback"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-md" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-36" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-4 w-20 rounded-md" />
                      <Skeleton className="h-4 w-16 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20 rounded-md shrink-0" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-7 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
