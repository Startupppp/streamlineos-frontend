import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import WikiSearchPage from "@/features/wiki/components/wiki-search-page";

export default async function KnowledgeBaseSearchPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <WikiSearchPage />
    </RequireModule>
  );
}
