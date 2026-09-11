import { requireModulePermission } from "@/lib/rbac/require-permission";
import { SignDashboard } from "@/features/sign";

export default async function SignDashboardPage() {
  await requireModulePermission("sign", "sign:envelope:view");
  return <SignDashboard />;
}
