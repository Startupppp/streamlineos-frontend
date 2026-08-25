import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import SpacesPage from "@/features/wiki/components/spaces-page";

export default async function KnowledgeBaseSpacesPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <SpacesPage />
    </RequireModule>
  );
}
