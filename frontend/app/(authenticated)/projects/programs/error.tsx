"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProgramsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Programs Error" fallbackMessage="Failed to load programs. Please try again." />;
}
