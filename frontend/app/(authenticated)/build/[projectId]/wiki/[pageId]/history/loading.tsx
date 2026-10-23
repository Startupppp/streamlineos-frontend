import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageHistorySkeleton } from "@/features/wiki/components/page-history-skeleton";
import { WIKI_LOADING_CONTENT_CLASS } from "@/features/wiki/components/wiki-collection-skeletons";

export default function ProjectWikiHistoryLoading() {
  return (
    <PageWrapper title="File history" noInternalScroll contentClassName={WIKI_LOADING_CONTENT_CLASS}>
      <PageHistorySkeleton />
    </PageWrapper>
  );
}
