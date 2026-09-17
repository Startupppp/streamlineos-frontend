import { redirect } from "next/navigation";
import { MyOnboardingTasksPage } from "@/features/hr/onboarding/my-onboarding-tasks-page";
import { requirePermission } from "@/lib/rbac/require-permission";
import { getServerAccess } from "@/lib/rbac/get-server-access";

export default async function MyOnboardingRoute() {
  const access = await getServerAccess();
  if (access.isOrgOwner) redirect("/dashboard");
  await requirePermission("self:onboarding-tasks");
  return <MyOnboardingTasksPage />;
}
