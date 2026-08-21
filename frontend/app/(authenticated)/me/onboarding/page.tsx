import { MyOnboardingTasksPage } from "@/features/hr/onboarding/my-onboarding-tasks-page";
import { requireModulePermission } from "@/lib/rbac/require-permission";

export default async function MyOnboardingRoute() {
  await requireModulePermission("hr", "self:onboarding-tasks");
  return <MyOnboardingTasksPage />;
}
