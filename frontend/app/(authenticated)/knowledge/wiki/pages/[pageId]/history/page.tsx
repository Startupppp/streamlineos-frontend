import { notFound } from "next/navigation";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import PageHistoryPage from "@/features/knowledge-base/components/page-history-page";

interface PageParams {
  pageId: string;
}

export default async function WikiPageHistoryRoute({
  params,
}: {
  params: Promise<PageParams>;
}) {
  await requireSession();
  const { pageId: rawPageId } = await params;
  const pageId = parseInt(rawPageId, 10);
  if (!Number.isFinite(pageId) || pageId <= 0) {
    notFound();
  }
  return (
    <RequireModule module="kb">
      <PageHistoryPage pageId={pageId} />
    </RequireModule>
  );
}
