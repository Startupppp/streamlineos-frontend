import { notFound } from "next/navigation";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import PageDocument from "@/features/wiki/components/page-document";

interface PageParams {
  pageId: string;
}

export default async function WikiPageRoute({
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
      <PageDocument pageId={pageId} />
    </RequireModule>
  );
}
