import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CandidateDetailLoading() {
  return (
    <PageWrapper title="Candidate" subtitle="Loading...">
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </PageWrapper>
  );
}
