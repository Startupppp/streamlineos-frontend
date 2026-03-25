import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CyclesLoading() {
  return (
    <div className="h-full flex flex-col">
      {/* Header: SubNav + title row */}
      <div className="flex-shrink-0 px-6 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background border-b">
        {/* SubNav tabs */}
        <div className="flex items-center gap-4 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        {/* Title + New Cycle button */}
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Content: cycle sections */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Active section */}
        <section>
          <Skeleton className="h-4 w-16 mb-3" />
          <Card className="mb-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-24 mt-1" />
            </CardContent>
          </Card>
        </section>

        {/* Upcoming section */}
        <section>
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <Skeleton className="h-5 w-36 mb-1" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
