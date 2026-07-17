import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function TerminationLoading() {
  return (
    <PageWrapper
      title="Termination Management"
      subtitle="Manage employee terminations"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
