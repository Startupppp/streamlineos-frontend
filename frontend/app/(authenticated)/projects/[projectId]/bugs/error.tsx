"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function BugsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary {...props} title="Bugs Error" fallbackMessage="Failed to load bugs." />;
}
