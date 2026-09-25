"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { useSandboxCatalogue } from "@/hooks/api/hr/recruitment/developer-sandbox";
import { DirectorySyncSection } from "./directory-sync-section";
import { EventCatalogueSection } from "./event-catalogue-section";
import { DeliveryLogSection } from "./delivery-log-section";
import { ReplaySection } from "./replay-section";

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

/**
 * The developer's view of Recruitment OS: the five hiring events, how to verify
 * one, a way to fire one on demand, and the honest state of sign-on and
 * directory sync.
 *
 * It exists because the webhook was previously undocumented and untestable from
 * inside the product — a tenant integrating it had to trigger a real hire to
 * find out whether their receiver worked, and the test button fired a different
 * event from the one they had subscribed to.
 */
export function AtsDeveloperSandboxPage() {
  const { data, isLoading, isError, error, refetch } = useSandboxCatalogue();
  const pageState = usePageState({
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && (data?.events.length ?? 0) === 0,
  });

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  return (
    <PageWrapper
      title="Developer"
      subtitle="Hiring webhooks, signature verification, and what sign-on and directory sync actually do here."
      backHref="/hr/recruitment/integrations"
    >
      <PageState resolution={pageState} loading={<LoadingSkeleton />} onRetry={handleRetry}>
        <div className="space-y-6">
          <DirectorySyncSection />
          {data && <EventCatalogueSection catalogue={data} />}
          <ReplaySection />
          <DeliveryLogSection />
        </div>
      </PageState>
    </PageWrapper>
  );
}
