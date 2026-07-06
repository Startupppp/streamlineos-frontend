import { PageWrapper } from "@/components/ui/page-wrapper";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectMeetingsLoading() {
  return (
    <PageWrapper
      title="Meetings"
      eyebrow="Project"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-52 rounded-md" />
        </div>
      }
    >
      <div className="px-4 pb-4">
        <SkeletonTable rows={6} columns={7} />
      </div>
    </PageWrapper>
  );
}
