import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import PageDocument from "@/features/wiki/components/page-document";
import { prefetchKbPageDetail } from "@/lib/prefetch/knowledge";
import WikiDocumentLoading from "./loading";

interface PageParams {
  pageId: string;
}

async function WikiDocumentHydrated({
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
  const state = await prefetchKbPageDetail(pageId);
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <PageDocument pageId={pageId} />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function WikiPageRoute({
  params,
}: {
  params: Promise<PageParams>;
}) {
  return (
    <Suspense fallback={<WikiDocumentLoading />}>
      <WikiDocumentHydrated params={params} />
    </Suspense>
  );
}
