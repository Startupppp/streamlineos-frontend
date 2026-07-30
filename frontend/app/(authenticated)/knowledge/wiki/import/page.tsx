import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import ImportPage from "@/features/knowledge-base/components/import-page";

export default async function KnowledgeBaseImportPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <ImportPage />
    </RequireModule>
  );
}
