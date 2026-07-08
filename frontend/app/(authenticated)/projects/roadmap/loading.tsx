import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function RoadmapLoading() {
  return (
    <PageWrapper
      title="Roadmap"
      eyebrow="Projects"
      subtitle="Plan publicly, collect feedback and ship a changelog"
      filters={<Skeleton className="h-8 w-72 rounded-md" />}
      actions={<Skeleton className="h-8 w-24 rounded-md" />}
    >
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
