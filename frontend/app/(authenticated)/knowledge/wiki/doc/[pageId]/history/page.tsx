import { notFound } from "next/navigation";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import PageHistoryPage from "@/features/wiki/components/page-history-page";

interface PageParams {
  pageId: string;
}

interface SearchParams {
  version?: string;
  compare?: string;
}

export default async function WikiPageHistoryRoute({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  await requireSession();
  const { pageId: rawPageId } = await params;
  const pageId = parseInt(rawPageId, 10);
  if (!Number.isFinite(pageId) || pageId <= 0) {
    notFound();
  }
  const { version, compare } = await searchParams;
  const initialVersion = version ? parseInt(version, 10) : undefined;
  const initialCompare = compare ? parseInt(compare, 10) : undefined;
  return (
    <RequireModule module="kb">
      <PageHistoryPage
        pageId={pageId}
        initialVersion={Number.isFinite(initialVersion) && (initialVersion ?? 0) > 0 ? initialVersion : undefined}
        initialCompare={Number.isFinite(initialCompare) && (initialCompare ?? 0) > 0 ? initialCompare : undefined}
      />
    </RequireModule>
  );
}
