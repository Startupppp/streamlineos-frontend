import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrgHubLoading() {
  return (
    <PageWrapper
      title="Organisation Structure"
      subtitle="Manage departments, teams, locations, and job catalog"
      noInternalScroll
      contentClassName="flex flex-col gap-4"
    >
      <StatCardGridSkeleton cols={4} count={4} />
      <Skeleton className="h-9 w-[340px] rounded-md" />
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </PageWrapper>
  );
}
