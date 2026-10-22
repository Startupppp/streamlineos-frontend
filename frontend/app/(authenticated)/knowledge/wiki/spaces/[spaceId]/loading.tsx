import { PageWrapper } from "@/components/ui/page-wrapper";
import { SpaceDetailSkeleton } from "@/features/wiki/components/space-detail-skeleton";

export default function TeamFolderDetailLoading() {
  return (
    <PageWrapper title="Team folder">
      <SpaceDetailSkeleton />
    </PageWrapper>
  );
}
