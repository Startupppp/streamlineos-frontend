"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function DelegationsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Delegations Error"
      fallbackMessage="Failed to load delegations."
    />
  );
}
