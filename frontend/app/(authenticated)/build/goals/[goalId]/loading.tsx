import { PageWrapper } from "@/components/ui/page-wrapper";
import { GoalDetailSkeleton } from "@/features/build/goals/goal-detail-skeleton";

export default function GoalDetailLoading() {
  return (
    <PageWrapper title="Goal" backHref="/build/goals">
      <GoalDetailSkeleton />
    </PageWrapper>
  );
}
