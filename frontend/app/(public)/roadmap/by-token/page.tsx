import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicRoadmapTokenView } from "@/features/build/public/public-roadmap-token-view";
import { LoadingState } from "@/components/shared/loading-state";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicRoadmapByTokenPage() {
  return (
    <Suspense fallback={<LoadingState variant="cards" rows={9} />}>
      <PublicRoadmapTokenView />
    </Suspense>
  );
}
