import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import KnowledgeSettingsPage from "@/features/knowledge-base/components/knowledge-settings-page";

export default async function KnowledgeBaseSettingsPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <KnowledgeSettingsPage />
    </RequireModule>
  );
}
