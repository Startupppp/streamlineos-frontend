import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import ReviewsPage from "@/features/knowledge-base/components/reviews-page";

export default async function KnowledgeBaseReviewsPage() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <ReviewsPage />
    </RequireModule>
  );
}
