import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import RecentPage from "@/features/knowledge-base/components/recent-page";

export default async function KnowledgeBaseRecentPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <RecentPage />
    </RequireModule>
  );
}
