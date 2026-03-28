import { Card, CardContent, CardHeader } from "./card";
import { Skeleton } from "./skeleton";

export function LeavesPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-72 rounded-lg" />

      {/* Balance cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border">
            <CardContent className="pt-5 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Request History */}
        <div className="lg:col-span-8">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-6 ml-auto rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* New Request form */}
        <div className="lg:col-span-4">
          <Card className="border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-5 w-28 mb-1" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <Skeleton className="h-3 w-16 mb-1.5" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Skeleton className="h-3 w-10 mb-1.5" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div>
                  <Skeleton className="h-3 w-6 mb-1.5" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-32" />
              <div>
                <Skeleton className="h-3 w-12 mb-1.5" />
                <Skeleton className="h-20 w-full rounded-md" />
              </div>
              <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
