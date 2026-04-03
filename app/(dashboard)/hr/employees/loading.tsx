import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeesLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <Skeleton className="h-10 w-[130px] rounded-md" />
          <Skeleton className="h-10 w-[140px] rounded-md" />
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-[120px] rounded-md" />
        <Skeleton className="h-9 w-[120px] rounded-md" />
      </div>

      {/* Employee table */}
      <Card className="shadow-sm border overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* Table rows */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <Skeleton className="h-9 w-[90px] rounded-md" />
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-9 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-9 w-[70px] rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
