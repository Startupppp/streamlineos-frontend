import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import FavoritesPage from "@/features/wiki/components/favorites-page";

export default async function KnowledgeBaseFavoritesPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <FavoritesPage />
    </RequireModule>
  );
}
