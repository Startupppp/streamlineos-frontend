import { requirePermission } from "@/lib/rbac/require-permission";
import { PortalListPage } from "@/features/build/client-portal/portal-list-page";

export default async function PortalRoute() {
  await requirePermission("build:portal:view");
  return <PortalListPage />;
}
