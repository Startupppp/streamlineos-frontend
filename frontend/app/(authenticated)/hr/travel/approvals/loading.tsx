import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function TravelApprovalsLoading() {
  return (
    <PageWrapper title="Travel Approvals" subtitle="Review pending travel requests">
      <div className="space-y-6">
        {Array.from({ length: 8 }).map((_, si) => (
          <div key={si} className="space-y-3">
            <Skeleton className="h-5 w-48" />
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="rounded-lg">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Skeleton className="h-8 w-28 rounded-md" />
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
