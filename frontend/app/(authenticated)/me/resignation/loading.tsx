import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyResignationLoading() {
  return (
    <PageWrapper title="Resignation" subtitle="Submit, follow and withdraw your resignation">
      <div role="status" aria-label="Loading resignations">
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
