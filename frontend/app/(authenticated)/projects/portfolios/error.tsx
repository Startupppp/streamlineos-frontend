"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PortfoliosError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Portfolios Error" fallbackMessage="Failed to load portfolios. Please try again." />;
}
