import { PageWrapper } from "@/components/ui/page-wrapper";
import { CompanyDocumentDetailSkeleton } from "@/features/wiki/components/company-document-detail-skeleton";
import {
  WIKI_LOADING_CONTENT_CLASS,
  WikiActionsSkeleton,
} from "@/features/wiki/components/wiki-collection-skeletons";

export default function CompanyDocumentLoading() {
  return (
    <PageWrapper
      title="Company document"
      subtitle="Company document"
      actions={<WikiActionsSkeleton />}
      noInternalScroll
      contentClassName={WIKI_LOADING_CONTENT_CLASS}
    >
      <CompanyDocumentDetailSkeleton />
    </PageWrapper>
  );
}
