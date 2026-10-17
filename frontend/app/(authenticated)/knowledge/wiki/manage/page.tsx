import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import ContentHealthPage from "@/features/wiki/components/content-health-page";

export default async function KnowledgeBaseManagePage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <ContentHealthPage />
    </RequireModule>
  );
}
