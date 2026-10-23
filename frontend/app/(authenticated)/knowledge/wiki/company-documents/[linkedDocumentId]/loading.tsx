import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyDocumentDetailSkeleton } from "@/features/wiki/components/company-document-detail-skeleton";
import { WIKI_LOADING_CONTENT_CLASS } from "@/features/wiki/components/wiki-collection-skeletons";

export default function CompanyDocumentLoading() {
  return (
    <PageWrapper
      title="Company document"
      subtitle="Company document"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <CompanyDocumentDetailSkeleton />
    </PageWrapper>
  );
}
