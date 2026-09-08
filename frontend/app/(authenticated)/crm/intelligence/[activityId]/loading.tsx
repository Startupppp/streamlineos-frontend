import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function CallIntelligenceDetailLoading() {
  return (
    <PageWrapper
      title="Call analysis"
      subtitle="Loading this call…"
      backHref="/crm/intelligence"
      backLabel="Back to call intelligence"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </PageWrapper>
  );
}
