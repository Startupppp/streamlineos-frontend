import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function DarkStoresLoading() {
  return (
    <PageWrapper
      title="Dark Stores"
      subtitle="What each Hyderabad zone is holding, and what it owes."
    >
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <div key={j} className="space-y-1.5">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-4 w-52" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
