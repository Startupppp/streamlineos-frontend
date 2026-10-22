import { PageWrapper } from "@/components/ui/page-wrapper";
import { CompanyDocumentsSkeleton } from "@/features/wiki/components/company-documents-skeleton";

export default function CompanyDocumentsLoading() {
  return (
    <PageWrapper title="Company documents" subtitle="Policies and documents HR has shared with you">
      <CompanyDocumentsSkeleton />
    </PageWrapper>
  );
}
