"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function IdentityError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Identity Verification Error"
      fallbackMessage="Failed to load identity verification data. Please try again."
    />
  );
}
