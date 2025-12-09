import { Card, CardContent } from "./card";
import { Skeleton } from "./skeleton";

export function KanbanColumnSkeleton() {
  return (
    <div className="flex flex-col gap-4 min-w-[300px]">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <CardContent className="p-0 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center justify-between mt-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function KanbanBoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <KanbanColumnSkeleton key={i} />
      ))}
    </div>
  );
}
