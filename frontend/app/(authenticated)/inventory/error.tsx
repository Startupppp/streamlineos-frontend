"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { ReportingRouteErrorBoundary } from "@/lib/observability/reporting-route-error-boundary";

/**
 * The inventory module's own boundary.
 *
 * Without one, a render throw on any of the 82 inventory routes escapes to
 * `app/(authenticated)/error.tsx` and the operator loses the module heading and
 * every sense of where they were — the nav rail survives, but the page reads as
 * though the whole application broke rather than one screen. Wrapping the house
 * recovery affordance in `PageWrapper` keeps the operator inside inventory: the
 * shell above renders as usual, the module is still named, and `reset()` re-runs
 * the segment that threw.
 *
 * Deliberately at the module root rather than on each route. Next.js resolves
 * the nearest ancestor boundary, so one file covers the tree; `rf/error.tsx` is
 * the single exception, because a handheld cannot recover through a desktop
 * page shell.
 */
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
