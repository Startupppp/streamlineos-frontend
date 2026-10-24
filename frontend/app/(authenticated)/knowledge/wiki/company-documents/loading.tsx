import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyDocumentsSkeleton } from "@/features/wiki/components/company-documents-skeleton";

export default function CompanyDocumentsLoading() {
  return (
    <PageWrapper
      title="Company documents"
      subtitle="Policies and documents HR has shared with you"
      filters={<Skeleton className="h-9 w-full rounded-md sm:w-44" />}
    >
      <CompanyDocumentsSkeleton />
    </PageWrapper>
  );
}
