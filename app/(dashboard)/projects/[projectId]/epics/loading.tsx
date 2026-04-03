import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EpicsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Epic cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            {/* Story rows */}
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 p-2 rounded-md border">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-full flex-1" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
