import { requirePermission } from "@/lib/rbac/require-permission";
import { ClientAccessPage } from "@/features/portal-access/client-access-page";

export default async function BuildClientAccessRoute() {
  await requirePermission("build:portal:view");
  return <ClientAccessPage />;
}
