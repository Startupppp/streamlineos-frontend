import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function IssuesLoading() {
  return (
    <PageWrapper
      title={<Skeleton className="h-5 w-40" />}
      noInternalScroll
      contentClassName="!p-0 flex flex-col"
    >
      <KanbanBoardSkeleton />
    </PageWrapper>
  );
}
