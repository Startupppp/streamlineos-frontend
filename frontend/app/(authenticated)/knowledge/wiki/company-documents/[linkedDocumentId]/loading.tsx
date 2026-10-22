import { PageWrapper } from "@/components/ui/page-wrapper";
import { CompanyDocumentDetailSkeleton } from "@/features/wiki/components/company-document-detail-skeleton";

export default function CompanyDocumentLoading() {
  return (
    <PageWrapper title="Company document" subtitle="Company document">
      <CompanyDocumentDetailSkeleton />
    </PageWrapper>
  );
}
