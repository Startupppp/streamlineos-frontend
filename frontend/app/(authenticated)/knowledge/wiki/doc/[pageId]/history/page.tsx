import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import PageHistoryPage from "@/features/wiki/components/page-history-page";
import { prefetchKbPageHistory } from "@/lib/prefetch/knowledge";
import WikiPageHistoryLoading from "./loading";

interface PageParams {
  pageId: string;
}

interface SearchParams {
  version?: string;
  compare?: string;
}

async function WikiPageHistoryHydrated({
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
  const state = await prefetchKbPageHistory(pageId);
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <PageHistoryPage
          pageId={pageId}
          initialVersion={Number.isFinite(initialVersion) && (initialVersion ?? 0) > 0 ? initialVersion : undefined}
          initialCompare={Number.isFinite(initialCompare) && (initialCompare ?? 0) > 0 ? initialCompare : undefined}
        />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function WikiPageHistoryRoute({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<WikiPageHistoryLoading />}>
      <WikiPageHistoryHydrated params={params} searchParams={searchParams} />
    </Suspense>
  );
}
