import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function ChatAccessRoute() {
  await requirePermission("chat:access:view");
  return <ModuleAccessPage moduleKey="chat" title="Chat Access" />;
}
