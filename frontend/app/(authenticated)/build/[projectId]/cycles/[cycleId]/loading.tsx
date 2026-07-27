import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CycleDetailLoading() {
  return (
    <PageWrapper title="Cycle" noInternalScroll>
      <KanbanBoardSkeleton />
    </PageWrapper>
  );
}
