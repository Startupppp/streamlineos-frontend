import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

export default function PipelineLoading() {
  return (
    <PageWrapper
      title="Recruitment Pipeline"
      subtitle="Drag candidates between stages to update their status"
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
        </div>
      }
      filters={<Skeleton className="h-9 w-[110px] rounded-lg" />}
    >
      <div className="flex gap-4 overflow-x-auto h-full">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border flex flex-col bg-muted/30 border-t-2 min-w-[280px]"
          >
            <div className="flex items-center justify-between p-3 rounded-t-xl bg-muted/50">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-5 w-6 rounded-md" />
            </div>
            <ScrollArea hideScrollbar className="min-h-0 flex-1">
              <div className="overscroll-contain space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Card key={j} className="p-3 shadow-sm">
                    <CardContent className="p-0 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <div className="flex items-center justify-between pt-1">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
