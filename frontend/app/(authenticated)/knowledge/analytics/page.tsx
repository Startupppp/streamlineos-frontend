import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import KnowledgeAnalyticsPage from "@/features/knowledge-base/components/knowledge-analytics-page";

export default async function KnowledgeBaseAnalyticsPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <KnowledgeAnalyticsPage />
    </RequireModule>
  );
}
