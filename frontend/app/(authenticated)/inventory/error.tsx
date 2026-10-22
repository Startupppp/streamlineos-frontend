"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

export default function InventoryError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageWrapper title="Inventory" subtitle="Stock, movement, and fulfilment operations">
      <ReportingRouteErrorBoundary
        {...props}
        title="This inventory screen could not be displayed"
        fallbackMessage="Nothing was written to stock — the screen failed while rendering. Try again, or pick another inventory screen from the navigation."
      />
    </PageWrapper>
  );
}
