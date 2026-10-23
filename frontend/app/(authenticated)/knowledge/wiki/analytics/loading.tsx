import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnalyticsSkeleton } from "@/features/wiki/components/knowledge-analytics-skeleton";
import { WIKI_LOADING_CONTENT_CLASS } from "@/features/wiki/components/wiki-collection-skeletons";

export default function KnowledgeAnalyticsLoading() {
  return (
    <PageWrapper title="Analytics" noInternalScroll contentClassName={WIKI_LOADING_CONTENT_CLASS}>
      <AnalyticsSkeleton />
    </PageWrapper>
  );
}
