import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import KnowledgeBasePage from "@/features/knowledge-base/components/knowledge-base-page";

export default async function KnowledgeBaseRoute() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <KnowledgeBasePage />
    </RequireModule>
  );
}
