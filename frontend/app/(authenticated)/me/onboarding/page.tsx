import { MyOnboardingTasksPage } from "@/features/hr/onboarding/my-onboarding-tasks-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function MyOnboardingRoute() {
  await requirePermission("self:onboarding-tasks");
  return <MyOnboardingTasksPage />;
}
