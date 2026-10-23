import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiActionsSkeleton,
  WikiHomeSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function ProjectWikiLoading() {
  return (
    <PageWrapper
      title="Docs"
      noInternalScroll
      subtitle="Docs and decisions for this project"
      actions={<WikiActionsSkeleton count={3} />}
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <WikiHomeSkeleton />
    </PageWrapper>
  );
}
