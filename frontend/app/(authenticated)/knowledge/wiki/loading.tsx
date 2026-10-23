import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiActionsSkeleton,
  WikiHomeSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function KnowledgeBaseLoading() {
  return (
    <PageWrapper
      title="Docs"
      subtitle="Files, documents and decisions for your team"
      actions={<WikiActionsSkeleton count={3} />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <WikiHomeSkeleton />
    </PageWrapper>
  );
}
