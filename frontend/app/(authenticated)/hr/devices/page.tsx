import { requirePermission } from "@/lib/rbac/require-permission";
import { DevicesPage } from "@/features/hr/devices/devices-page";

export default async function Page() {
  await requirePermission("hr:biometric:manage");
  return <DevicesPage />;
}
