import { PageWrapper } from "@/components/ui/page-wrapper";
import { ContentHealthSkeleton } from "@/features/wiki/components/content-health-skeleton";
import { WIKI_LOADING_CONTENT_CLASS } from "@/features/wiki/components/wiki-collection-skeletons";

export default function ContentHealthLoading() {
  return (
    <PageWrapper title="Content Health" noInternalScroll contentClassName={WIKI_LOADING_CONTENT_CLASS}>
      <ContentHealthSkeleton />
    </PageWrapper>
  );
}
