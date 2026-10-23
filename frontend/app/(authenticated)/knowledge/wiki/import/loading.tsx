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
      actions={
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
          <Skeleton className="h-9 w-full rounded-md sm:w-28" />
          <Skeleton className="h-9 w-full rounded-md sm:w-32" />
        </div>
      }
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <WikiImportSkeleton />
    </PageWrapper>
  );
}
