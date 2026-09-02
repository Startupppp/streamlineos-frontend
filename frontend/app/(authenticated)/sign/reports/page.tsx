import { requireModulePermission } from "@/lib/rbac/require-permission";
import { ReportsPage } from "@/features/sign";

export default async function SignReportsPage() {
  await requireModulePermission("sign", "sign:audit:view");
  return <ReportsPage />;
}
