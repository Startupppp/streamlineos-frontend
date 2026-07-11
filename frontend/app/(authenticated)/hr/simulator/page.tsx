import { requirePermission } from "@/lib/rbac/require-permission";
import { SimulatorPageContent } from "@/features/hr/enterprise/ops/simulator/simulator-page-content";

export default async function HrSimulatorPage() {
  await requirePermission("hr:policies:manage");
  return <SimulatorPageContent />;
}
