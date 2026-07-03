import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import PrivatePage from "@/features/knowledge-base/components/private-page";

export default async function KnowledgeBasePrivatePage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <PrivatePage />
    </RequireModule>
  );
}
