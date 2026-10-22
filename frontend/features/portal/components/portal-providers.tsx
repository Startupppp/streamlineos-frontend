"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";
import {
  PORTAL_ANONYMOUS_SCOPE,
  PortalApiError,
  portalTokenScope,
  subscribePortalToken,
} from "@/lib/portal-api-client";

const MAX_PORTAL_RETRIES = 1;

function shouldRetryPortalQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_PORTAL_RETRIES) return false;
  if (error instanceof PortalApiError) {
    const status = error.status;
    if (status !== undefined && status >= 400 && status < 500)
      return status === 408 || status === 429;
  }
  return true;
}

function createPortalQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
        retry: shouldRetryPortalQuery,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

function ScopedPortalProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createPortalQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function PortalProviders({ children }: { children: React.ReactNode }) {
  const scope = useSyncExternalStore(
    subscribePortalToken,
    portalTokenScope,
    () => PORTAL_ANONYMOUS_SCOPE,
  );

  return (
    <ScopedPortalProviders key={scope}>{children}</ScopedPortalProviders>
  );
}
