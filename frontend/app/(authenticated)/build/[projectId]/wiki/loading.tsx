import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiHomeSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function ProjectWikiLoading() {
  return (
    <PageWrapper
      title="Docs"
      noInternalScroll
      subtitle="Docs and decisions for this project"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <WikiHomeSkeleton />
    </PageWrapper>
  );
}
