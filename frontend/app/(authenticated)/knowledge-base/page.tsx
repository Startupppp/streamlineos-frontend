import { requirePermission } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import WikiHomePage from "@/features/knowledge-base/components/wiki-home-page";

export default async function KnowledgeBasePage() {
  await requirePermission("kb:pages:view");
  return (
    <RequireModule module="kb">
      <WikiHomePage />
    </RequireModule>
  );
}
