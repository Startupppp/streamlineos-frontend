import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

function ModuleCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-5 w-9 rounded-full" />
      </CardContent>
    </Card>
  );
}

export default function ModulesLoading() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-72" />
          </div>
        </div>
      </div>
      <div className="shrink-0 mx-4 sm:mx-6 h-px bg-border" />
      <ScrollArea hideScrollbar className="flex-1 min-h-0">
        <div className="overscroll-contain px-4 sm:px-6 pt-3 pb-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <ModuleCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
