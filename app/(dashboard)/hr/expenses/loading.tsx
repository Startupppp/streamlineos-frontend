import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensesLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <Skeleton className="h-10 w-[130px] rounded-md" />
          <Skeleton className="h-10 w-[120px] rounded-md" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-7 w-20" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {["All Claims", "Pending", "Approved", "Rejected"].map((tab) => (
          <Skeleton key={tab} className="h-9 rounded-full" style={{ width: `${tab.length * 9 + 28}px` }} />
        ))}
        <Skeleton className="h-9 w-[110px] rounded-full ml-auto" />
      </div>

      {/* Claims list */}
      <Card className="shadow-sm border overflow-hidden">
        <CardContent className="p-0">
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>

          {/* Claim rows */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-5 border-b last:border-b-0">
              {/* Receipt thumbnail */}
              <Skeleton className="h-20 w-[100px] rounded-lg flex-shrink-0" />

              {/* Claim details */}
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-48" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-20 ml-4" />
                  <Skeleton className="h-3.5 w-24 ml-4" />
                </div>
              </div>

              {/* Amount + actions */}
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-7 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-[72px] rounded-md" />
                  <Skeleton className="h-9 w-[80px] rounded-md" />
                </div>
              </div>
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
