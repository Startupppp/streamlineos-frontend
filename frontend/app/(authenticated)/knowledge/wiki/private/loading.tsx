import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  CollectionToolbarSkeleton,
  WIKI_LOADING_CONTENT_CLASS,
  WIKI_PAGE_TABLE_HEADERS,
  WikiActionsSkeleton,
  WikiFillTable,
  WikiShortcutRowsSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function MyFilesLoading() {
  return (
    <PageWrapper
      title="My files"
      subtitle="Files you own"
      actions={<WikiActionsSkeleton />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <WikiShortcutRowsSkeleton />
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <CollectionToolbarSkeleton />
          <WikiFillTable headers={WIKI_PAGE_TABLE_HEADERS} />
        </div>
      </div>
    </PageWrapper>
  );
}
