import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LiveSessionHostSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:flex-none sm:w-36" />
          <Skeleton className="ml-auto h-4 w-16" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Skeleton className="h-9 w-full rounded-md sm:w-20" />
            <Skeleton className="h-9 w-full rounded-md sm:w-28" />
            <Skeleton className="col-span-2 h-9 w-full rounded-md sm:col-span-1 sm:w-24" />
          </div>
          <Skeleton className="h-32 w-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
