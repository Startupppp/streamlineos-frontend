import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import SharedPage from "@/features/wiki/components/shared-page";

export default async function KnowledgeBaseSharedPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <SharedPage />
    </RequireModule>
  );
}
