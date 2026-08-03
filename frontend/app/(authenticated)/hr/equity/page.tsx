import { requirePermission } from "@/lib/rbac/require-permission";
import { EquityPage } from "@/features/hr/enterprise/comp/equity-page";

export default async function HrEquityPage() {
  await requirePermission("hr:equity:view");
  return <EquityPage />;
}
