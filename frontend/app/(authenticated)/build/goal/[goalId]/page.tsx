import { GoalDetailPage } from "@/features/build/goals/goal-detail-page";

export default async function Page({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  return <GoalDetailPage goalId={Number(goalId)} />;
}
