import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function MyWorkLoading() {
  return (
    <PageWrapper title="My Work" subtitle="Your assigned tickets across all projects">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </PageWrapper>
  );
}
