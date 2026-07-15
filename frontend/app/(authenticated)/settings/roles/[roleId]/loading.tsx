import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function RoleEditorLoading() {
  return (
    <PageWrapper
      title="Loading…"
      subtitle="Manage permissions for this role"
      noInternalScroll
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
    >
      <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-8" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-4 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:flex-1 lg:min-h-0 flex flex-col">
          <div className="p-4 pb-3 flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
          <Separator />
          <div className="divide-y divide-border/30">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-4 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
