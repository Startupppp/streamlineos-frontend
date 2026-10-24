import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Geometry match for the live session host ready layout (FE-142). */
export function LiveSessionHostSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="ml-auto h-4 w-16" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <Skeleton className="h-32 w-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
