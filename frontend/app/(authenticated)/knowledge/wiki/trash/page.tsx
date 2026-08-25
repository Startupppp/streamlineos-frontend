import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import TrashPage from "@/features/wiki/components/trash-page";

export default async function KnowledgeBaseTrashPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <TrashPage />
    </RequireModule>
  );
}
