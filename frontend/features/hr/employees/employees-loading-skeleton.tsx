import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export function EmployeesGridSkeleton({ count = 15 }: { count?: number }) {
  return (
    <div className="grid gap-3 grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} />

        <div className="grid sm:grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card
              key={`widget-a-${i}`}
              className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)]"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-lg" />{" "}
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
      </div>

      <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden mt-4">
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
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />{" "}
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
              <Skeleton className="h-10 w-10 rounded-md ml-auto" />{" "}
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <Skeleton className="h-4 w-36 rounded-md" />{" "}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28 rounded-md" />{" "}
            </div>
            <Skeleton className="h-4 w-20 rounded-md" />{" "}
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
