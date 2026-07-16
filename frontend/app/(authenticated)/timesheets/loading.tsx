import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function TimesheetsLoading() {
  return (
    <PageWrapper
      title="My Time"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1">
          <Skeleton className="h-9 w-14 rounded-md" />
          <Skeleton className="h-9 w-14 rounded-md" />
          <Skeleton className="h-9 w-14 rounded-md" />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-lg">
              <div className="bg-muted/40 px-3 py-2 grid gap-1" style={{ gridTemplateColumns: "12rem repeat(7, 4rem) 3.5rem" }}>
                <Skeleton className="h-3 w-24" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-8 mx-auto" />
                ))}
              </div>
              <div className="divide-y divide-border">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="px-3 py-2 grid items-center gap-1" style={{ gridTemplateColumns: "12rem repeat(7, 4rem) 3.5rem" }}>
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <Skeleton key={j} className="h-8 w-12 mx-auto rounded" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
