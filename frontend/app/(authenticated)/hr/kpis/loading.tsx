import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function KpisLoading() {
  return (
    <PageWrapper
      title="KPIs & Competencies"
      subtitle="Define performance indicators and competency frameworks"
    >
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-44 rounded-lg" />
        </div>
        <div className="flex gap-3 items-center justify-between">
          <Skeleton className="h-9 w-60 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card
              key={i}
              className="bg-card border border-border rounded-xl shadow-sm"
            >
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />{" "}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
