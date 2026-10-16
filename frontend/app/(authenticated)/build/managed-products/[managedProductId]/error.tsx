"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { PmPageShell } from "@/components/pm-chrome";
import { isChunkLoadError, reportError } from "@/lib/observability";
import { managedProductRouteTitle } from "@/features/build/managed-products/managed-product-route-title";

export default function ManagedProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const title = managedProductRouteTitle(pathname);

  useEffect(() => {
    const route = typeof window !== "undefined" ? window.location.pathname : undefined;
    const extra: Record<string, unknown> = { route, digest: error.digest };
    if (isChunkLoadError(error)) extra.recoverable = true;
    reportError(error, extra);
  }, [error]);

  return (
    <PageWrapper title={title} backHref="/build/managed-products">
      <PmPageShell>
        <ErrorState onRetry={reset} />
      </PmPageShell>
    </PageWrapper>
  );
}
