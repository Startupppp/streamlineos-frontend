import { requirePermission } from "@/lib/rbac/require-permission";
import { ClientAccessPage } from "@/features/portal-access/client-access-page";

export default async function ClientAccessRoute() {
  await requirePermission("projects:portal:view");
  return <ClientAccessPage />;
}
