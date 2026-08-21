import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function MailAccessRoute() {
  await requirePermission("mail:access:view");
  return <ModuleAccessPage moduleKey="mail" title="Mail Access" />;
}
