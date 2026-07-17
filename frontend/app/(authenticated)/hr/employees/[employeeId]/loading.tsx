import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function EmployeeDetailLoading() {
  return (
    <PageWrapper
      title="Employee Profile"
      subtitle="View and edit employee details"
      actions={
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-[100px] rounded-md" />
        </div>
      }
      noInternalScroll
      contentClassName="flex flex-col gap-3"
    >
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden shrink-0 border-l-4">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-5">
            <Skeleton className="h-20 w-20 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-start gap-2 flex-wrap">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-6 w-44" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="pt-1">
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Skeleton className="h-9 w-full max-w-sm shrink-0 rounded-md" />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <div className="space-y-0.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-36" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <div className="space-y-0.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-3">
          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardContent className="p-4 space-y-2.5">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-border bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 divide-x divide-border">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="text-center px-4 first:pl-0 last:pr-0 space-y-1.5">
                    <Skeleton className="h-8 w-12 mx-auto" />
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
