import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CrmApiKeysPage } from "@/features/settings/api-tokens/crm-api-keys-page";

export default async function CrmApiKeysRoute() {
  const { access } = await requirePermission("crm:settings:manage");
  if (access.modules.crm === false) redirect("/access-denied?required=crm");

  return <CrmApiKeysPage />;
}
