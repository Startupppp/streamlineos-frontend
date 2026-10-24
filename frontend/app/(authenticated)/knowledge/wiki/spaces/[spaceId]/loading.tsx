import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { SpaceDetailSkeleton } from "@/features/wiki/components/space-detail-skeleton";
import { WikiActionsSkeleton } from "@/features/wiki/components/wiki-collection-skeletons";

export default function TeamFolderDetailLoading() {
  return (
    <PageWrapper
      title="Team folder"
      leading={<Skeleton className="size-8 shrink-0 rounded-md" />}
      actions={<WikiActionsSkeleton count={3} />}
    >
      <SpaceDetailSkeleton />
    </PageWrapper>
  );
}
