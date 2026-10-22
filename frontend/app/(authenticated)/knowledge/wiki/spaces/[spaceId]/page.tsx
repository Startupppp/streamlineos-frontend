import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import SpaceDetailPage from "@/features/wiki/components/space-detail-page";
import { prefetchKbSpaceDetail } from "@/lib/prefetch/knowledge";
import SpaceDetailLoading from "./loading";

interface Props {
  params: Promise<{ spaceId: string }>;
}

async function SpaceDetailHydrated({ params }: Props) {
  const { spaceId } = await params;
  await requireSession();
  const state = await prefetchKbSpaceDetail(Number(spaceId));
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <SpaceDetailPage spaceId={Number(spaceId)} />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseSpaceDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<SpaceDetailLoading />}>
      <SpaceDetailHydrated params={params} />
    </Suspense>
  );
}
