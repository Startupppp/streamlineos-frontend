import { requirePermission } from "@/lib/rbac/require-permission";
import { SimulatePage } from "@/features/settings/simulate/simulate-page";

export default async function Page() {
  await requirePermission("settings:rbac:manage");
  return <SimulatePage />;
}
