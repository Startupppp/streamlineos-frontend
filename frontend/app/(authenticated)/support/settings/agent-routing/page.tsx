import { requirePermission } from "@/lib/rbac/require-permission";
import { SupportAgentRoutingPage } from "@/features/support/settings/agent-routing-page";

export default async function Page() {
  await requirePermission("support:macros:view");
  return <SupportAgentRoutingPage />;
}
