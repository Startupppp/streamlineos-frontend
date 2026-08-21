"use client";

import "@/lib/dom-mutation-guard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isApiError } from "@/lib/api-client";
import { registerQueryCacheClearer } from "@/lib/query-cache-control";

const MAX_QUERY_RETRIES = 1;

/**
 * A 4xx is a verdict, not a blip — retrying a 403/404/409 just doubles the
 * request volume (and the Neon CPU bill) without ever changing the answer.
 * 408 and 429 are the exceptions: both explicitly invite a retry.
 */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  if (isApiError(error)) {
    const status = error.status;
    if (status !== undefined && status >= 400 && status < 500) {
      return status === 408 || status === 429;
    }
  }
  return true;
}

export function createAppQueryClient(scope = "unscoped"): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        queryKeyHashFn: (queryKey) => JSON.stringify([scope, queryKey]),
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

function ScopedQueryProvider({
  children,
  scope,
}: {
  children: React.ReactNode;
  scope: string;
}) {
  const [queryClient] = useState(() => createAppQueryClient(scope));

  useEffect(
    () => registerQueryCacheClearer(() => queryClient.clear()),
    [queryClient],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? "";
  const orgId = session?.orgId ?? "";
  const scope =
    status === "authenticated"
      ? `authenticated:${orgId}:${userId}`
      : status === "loading"
        ? "loading"
        : "unauthenticated";

  return (
    <ScopedQueryProvider key={scope} scope={scope}>
      {children}
    </ScopedQueryProvider>
  );
}
