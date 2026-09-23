import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { GoalDetailPage } from "@/features/build/goals/goal-detail-page";

export default async function Page({ params }: { params: Promise<{ goalId: string }> }) {
  await enforceRouteAccess("/build/goals/[goalId]");
  const { goalId } = await params;
  return <GoalDetailPage goalId={Number(goalId)} />;
}
