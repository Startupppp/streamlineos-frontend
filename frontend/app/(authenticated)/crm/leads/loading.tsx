import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function LeadsPipelineLoading() {
  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Skeleton className="h-9 w-[180px] rounded-md" />
      <Skeleton className="h-9 w-[110px] rounded-md" />
      <Skeleton className="h-9 w-[110px] rounded-md" />
      <Skeleton className="h-9 w-[100px] rounded-md" />
      <Skeleton className="h-9 w-[110px] rounded-md" />
    </div>
  );

  return (
    <PageWrapper
      title="Lead Pipeline"
      subtitle="Track and manage leads through the conversion funnel"
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      }
      filters={filters}
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 mb-2">
          <StatCardGridSkeleton cols={5} count={5} />
        </div>
        <div className="flex-1 min-h-0 mt-2 overflow-auto">
          <KanbanBoardSkeleton />
        </div>
      </div>
    </PageWrapper>
  );
}
