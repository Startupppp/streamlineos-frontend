import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { MySupportPage } from "@/features/employee-support";
import { SupportRequestsTableSkeleton } from "@/features/employee-support";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { requireSession } from "@/lib/rbac/require-permission";
import { prefetchMeSupport } from "@/lib/prefetch/me";

export default async function EmployeeSupportPage() {
  await requireSession();
  const state = await prefetchMeSupport();
  return (
    <Suspense
      fallback={
        <PageWrapper
          title="Employee support"
          subtitle="Raise a request to HR, IT, Finance, Admin or Legal and follow it here."
          contentClassName="flex min-h-0 flex-1 flex-col"
        >
          <SupportRequestsTableSkeleton surface="self" />
        </PageWrapper>
      }
    >
      <HydrationBoundary state={state}>
        <MySupportPage />
      </HydrationBoundary>
    </Suspense>
  );
}
