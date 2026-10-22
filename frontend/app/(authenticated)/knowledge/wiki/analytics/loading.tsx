import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnalyticsSkeleton } from "@/features/wiki/components/knowledge-analytics-skeleton";

export default function KnowledgeAnalyticsLoading() {
  return (
    <PageWrapper title="Analytics">
      <AnalyticsSkeleton />
    </PageWrapper>
  );
}
