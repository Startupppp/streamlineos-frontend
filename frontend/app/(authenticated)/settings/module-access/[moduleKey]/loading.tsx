import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ModuleAccessLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="space-y-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-64" />
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[300px_1fr] flex-1 min-h-[400px]">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex items-center justify-center">
          <div className="text-center space-y-2 p-6">
            <Skeleton className="h-10 w-10 rounded-full mx-auto" />
            <Skeleton className="h-4 w-28 mx-auto" />
            <Skeleton className="h-3 w-48 mx-auto" />
          </div>
        </Card>
      </div>
    </div>
  );
}
