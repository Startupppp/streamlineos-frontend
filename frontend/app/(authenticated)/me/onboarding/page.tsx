import { redirect } from "next/navigation";
import { MyOnboardingTasksPage } from "@/features/hr/onboarding/my-onboarding-tasks-page";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import { getServerAccess } from "@/lib/rbac/get-server-access";

export default async function MyOnboardingRoute() {
  const access = await getServerAccess();
  if (access.isOrgOwner) redirect("/dashboard");
  await requireModulePermission("hr", "self:onboarding-tasks");
  return <MyOnboardingTasksPage />;
}
