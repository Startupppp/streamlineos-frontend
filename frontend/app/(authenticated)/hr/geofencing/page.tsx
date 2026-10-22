import { requirePermission } from "@/lib/rbac/require-permission";
import { GeofencingPage } from "@/features/hr/geofencing/geofencing-page";

export default async function Page() {
  await requirePermission("hr:attendance:view");
  return <GeofencingPage />;
}
