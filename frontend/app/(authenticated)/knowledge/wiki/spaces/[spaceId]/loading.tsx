import { PageWrapper } from "@/components/ui/page-wrapper";
import { SpaceDetailSkeleton } from "@/features/wiki/components/space-detail-skeleton";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiActionsSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function TeamFolderDetailLoading() {
  return (
    <PageWrapper
      title="Team folder"
      actions={<WikiActionsSkeleton count={3} />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <SpaceDetailSkeleton />
    </PageWrapper>
  );
}
