import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import PageDocument from "@/features/knowledge-base/components/page-document";

interface PageParams {
  pageId: string;
}

export default async function WikiPageRoute({
  params,
}: {
  params: Promise<PageParams>;
}) {
  await requirePermission("kb:pages:view");
  const { pageId: rawPageId } = await params;
  const pageId = parseInt(rawPageId, 10);
  if (!Number.isFinite(pageId) || pageId <= 0) {
    notFound();
  }
  return (
    <RequireModule module="kb">
      <PageDocument pageId={pageId} />
    </RequireModule>
  );
}
