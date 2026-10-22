import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { ManagerHomePage, ManagerHomeSkeleton } from "@/features/me/team/manager-home-page";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { requireSession } from "@/lib/rbac/require-permission";
import { prefetchMeTeam } from "@/lib/prefetch/me";

export default async function MyTeamPage() {
  await requireSession();
  const state = await prefetchMeTeam();
  return (
    <Suspense
      fallback={
        <PageWrapper title="My team" noInternalScroll contentClassName="flex min-h-0 flex-1 flex-col">
          <ManagerHomeSkeleton />
        </PageWrapper>
      }
    >
      <HydrationBoundary state={state}>
        <ManagerHomePage />
      </HydrationBoundary>
    </Suspense>
  );
}
