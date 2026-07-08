import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResourceAllocationLoading() {
  return (
    <PageWrapper
      title="Resource Allocation"
      eyebrow="Projects"
      subtitle="Open ticket distribution across team members and active projects"
    >
      <div className="grid grid-cols-3 gap-2 mb-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.25rem] rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
