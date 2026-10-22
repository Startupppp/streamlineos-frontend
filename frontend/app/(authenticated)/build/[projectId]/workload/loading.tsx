import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";

export default function ProjectWorkloadLoading() {
  return (
    <PageWrapper title="Workload" noInternalScroll>
      <KanbanBoardSkeleton />
    </PageWrapper>
  );
}
