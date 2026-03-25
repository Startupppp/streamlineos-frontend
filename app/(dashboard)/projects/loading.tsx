import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Filter bar (search + status chips + view toggle) */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <Skeleton className="h-8 w-18 rounded-md" />
        </div>
      </div>

      {/* Card grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-7 w-7 rounded" />
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <div>
                <Skeleton className="h-5 w-3/4 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            </CardContent>
            <CardFooter className="justify-between pt-3 border-t border-border/50">
              <div className="flex -space-x-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-7 w-7 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-3 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
