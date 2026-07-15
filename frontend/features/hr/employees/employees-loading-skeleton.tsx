import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function EmployeesGridSkeleton({ count = 15 }: { count?: number }) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/70 bg-card p-4 shadow-noir flex flex-col items-center gap-2"
        >
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-3.5 w-24 mt-1" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function EmployeesLoadingSkeleton() {
  return (
    <PageWrapper
      title="Employees"
      subtitle="Manage your company directory and employee access"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      }
      filters={
        <div className="flex items-center gap-2 w-full flex-wrap">
          <Skeleton className="h-8 w-[200px] rounded-md" />
          <Skeleton className="h-8 w-[130px] rounded-md" />
          <Skeleton className="h-8 w-[120px] rounded-md" />
          <Skeleton className="h-8 w-[120px] rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`stat-${i}`}
              className="rounded-2xl border border-border bg-card shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-10" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={`widget-a-${i}`} className="rounded-2xl border border-border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={`widget-b-${i}`} className="rounded-2xl border border-border shadow-sm">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[85%]" />
                <Skeleton className="h-3 w-[70%]" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={`widget-c-${i}`} className="rounded-2xl border border-border shadow-sm">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[90%]" />
                <Skeleton className="h-3 w-[72%]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="rounded-2xl border border-border shadow-sm overflow-hidden mt-4">
        <CardContent className="p-0">
          <div className="border-b px-4 py-3 flex items-center gap-8 bg-muted/40">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40 hidden md:block" />
            <Skeleton className="h-4 w-20 hidden lg:block" />
            <Skeleton className="h-4 w-24 hidden lg:block" />
            <Skeleton className="h-4 w-16 hidden lg:block" />
            <Skeleton className="h-4 w-20 hidden xl:block" />
            <Skeleton className="h-4 w-16 hidden xl:block" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-8 px-4 py-3.5 border-b last:border-0"
            >
              <div className="flex items-center gap-3 min-w-[220px]">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-44 hidden md:block" />
              <Skeleton className="h-4 w-28 hidden lg:block" />
              <Skeleton className="h-4 w-24 hidden lg:block" />
              <Skeleton className="h-5 w-16 rounded-full hidden lg:block" />
              <Skeleton className="h-5 w-10 rounded-full hidden xl:block" />
              <Skeleton className="h-4 w-12 hidden xl:block" />
              <Skeleton className="h-7 w-10 rounded-md ml-auto" />
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <Skeleton className="h-8 w-36 rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
