import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import KnowledgeAskPage from "@/features/knowledge-base/components/knowledge-ask-page";

export default async function KnowledgeBaseAskPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <KnowledgeAskPage />
    </RequireModule>
  );
}
