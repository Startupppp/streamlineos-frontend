"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function WidgetSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}
