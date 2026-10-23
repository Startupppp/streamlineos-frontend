import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiImportSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function WikiImportLoading() {
  return (
    <PageWrapper
      title="Import & Export"
      subtitle="Per-file export lives on each file's menu"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <WikiImportSkeleton />
    </PageWrapper>
  );
}
