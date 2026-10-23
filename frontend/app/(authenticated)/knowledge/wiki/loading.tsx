import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiHomeSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function KnowledgeBaseLoading() {
  return (
    <PageWrapper
      title="Docs"
      subtitle="Files, documents and decisions for your team"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <WikiHomeSkeleton />
    </PageWrapper>
  );
}
