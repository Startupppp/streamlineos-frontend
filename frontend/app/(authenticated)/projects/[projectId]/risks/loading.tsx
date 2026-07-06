import { PageWrapper } from "@/components/ui/page-wrapper";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectRisksLoading() {
  return (
    <PageWrapper
      title="Risk Register"
      eyebrow="Project"
      actions={<Skeleton className="h-8 w-28 rounded-md" />}
    >
      <div className="px-4 pb-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
        <Skeleton className="h-40 w-72 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-8 w-52 rounded-md" />
        </div>
        <SkeletonTable rows={5} columns={8} />
      </div>
    </PageWrapper>
  );
}
