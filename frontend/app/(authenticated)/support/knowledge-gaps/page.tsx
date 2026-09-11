import { requirePermission } from "@/lib/rbac/require-permission";
import { KnowledgeGapsPage } from "@/features/support/components/knowledge-gaps-page";

export default async function Page() {
  await requirePermission("support:knowledge-gaps:view");
  return <KnowledgeGapsPage />;
}
