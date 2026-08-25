import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import WikiHomePage from "@/features/wiki/components/wiki-home-page";

export default async function KnowledgeBasePage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <WikiHomePage />
    </RequireModule>
  );
}
