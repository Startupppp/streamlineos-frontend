import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrgChartLoading() {
  return (
    <div className="flex-1 space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-8">
            <Skeleton className="h-24 w-48 rounded-xl" />
            <div className="flex gap-12">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-4">
                  <Skeleton className="h-20 w-40 rounded-xl" />
                  <div className="flex gap-6">
                    <Skeleton className="h-16 w-32 rounded-lg" />
                    <Skeleton className="h-16 w-32 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
