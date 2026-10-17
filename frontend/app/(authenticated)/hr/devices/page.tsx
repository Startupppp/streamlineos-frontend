import { requirePermission } from "@/lib/rbac/require-permission";
import { DevicesPage } from "@/features/hr/devices/devices-page";

export default async function Page() {
  // Every devices endpoint is @RequirePermission("hr:biometric:manage").
  await requirePermission("hr:biometric:manage");
  return <DevicesPage />;
}
