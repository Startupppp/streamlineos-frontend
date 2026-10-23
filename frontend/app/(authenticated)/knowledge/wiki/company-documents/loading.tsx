import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyDocumentsSkeleton } from "@/features/wiki/components/company-documents-skeleton";
import { WIKI_LOADING_CONTENT_CLASS } from "@/features/wiki/components/wiki-collection-skeletons";

export default function CompanyDocumentsLoading() {
  return (
    <PageWrapper
      title="Company documents"
      subtitle="Policies and documents HR has shared with you"
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
      filters={
        <Skeleton className="h-9 w-44 rounded-md" />
      }
    >
      <CompanyDocumentsSkeleton />
    </PageWrapper>
  );
}
