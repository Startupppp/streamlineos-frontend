import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageHistorySkeleton } from "@/features/wiki/components/page-history-skeleton";

export default function ProjectWikiHistoryLoading() {
  return (
    <PageWrapper title="File history" noInternalScroll>
      <PageHistorySkeleton />
    </PageWrapper>
  );
}
