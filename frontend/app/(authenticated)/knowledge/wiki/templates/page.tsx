import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import TemplatesPage from "@/features/wiki/components/templates-page";

export default async function KnowledgeBaseTemplatesPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <TemplatesPage />
    </RequireModule>
  );
}
