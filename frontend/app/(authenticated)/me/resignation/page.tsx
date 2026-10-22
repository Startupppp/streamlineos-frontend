import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { MyResignationPage, MyResignationSkeleton } from "@/features/me/resignation/my-resignation-page";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchMeResignation } from "@/lib/prefetch/me";

export default async function MyResignationRoute() {
  await requirePermission("self:resignation");
  const state = await prefetchMeResignation();
  return (
    <Suspense
      fallback={
        <PageWrapper
          title="Resignation"
          subtitle="Submit, follow and withdraw your resignation"
          noInternalScroll
          contentClassName="flex min-h-0 flex-1 flex-col"
        >
          <MyResignationSkeleton />
        </PageWrapper>
      }
    >
      <HydrationBoundary state={state}>
        <MyResignationPage />
      </HydrationBoundary>
    </Suspense>
  );
}
