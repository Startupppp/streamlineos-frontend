import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  CollectionToolbarSkeleton,
  WIKI_LOADING_CONTENT_CLASS,
  WIKI_PAGE_TABLE_HEADERS,
  WikiFillTable,
} from "@/features/wiki/components/wiki-collection-skeletons";

const SHARED_HEADERS = [
  ...WIKI_PAGE_TABLE_HEADERS,
  "Shared by",
  "Shared",
  "Expires",
  "Location",
  "Access",
] as const;

export default function SharedFilesLoading() {
  return (
    <PageWrapper
      title="Shared with me"
      subtitle="Files explicitly shared with you"
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
        <CollectionToolbarSkeleton />
        <WikiFillTable headers={SHARED_HEADERS} />
      </div>
    </PageWrapper>
  );
}
