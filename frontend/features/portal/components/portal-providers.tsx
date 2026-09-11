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

/**
 * The same verdict rule the staff client uses: a 4xx is an answer, not a blip,
 * so retrying a portal 403 or 404 doubles the request volume without changing
 * it. 408 and 429 explicitly invite a retry. The bare `retry: 1` this replaces
 * retried every one of them.
 */
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

/**
 * The `key={scope}` remount the staff provider has and this one did not.
 * `queryKeys.portal.projects()` carries no subject dimension, so one client is
 * separated from the next only by holding a different QueryClient — and the
 * `(portal)` layout spans both the invitation page and the board, so accepting
 * a second invitation in the same browser kept the first client's cache alive
 * for its full 10 minute gcTime.
 */
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
