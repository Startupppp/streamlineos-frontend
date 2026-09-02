"use client";

import "@/lib/dom-mutation-guard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isApiError } from "@/lib/api-client";
import { isContractViolation } from "@/lib/api-envelope";
import { registerQueryCacheClearer } from "@/lib/query-cache-control";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";
import {
  LOADING_SCOPE,
  UNAUTHENTICATED_SCOPE,
  authenticatedScope,
  scopedQueryKeyHashFn,
} from "@/lib/query-scope";
import { OrgStorageScopeProvider } from "@/lib/org-scoped-storage";

const MAX_QUERY_RETRIES = 1;

/**
 * A 4xx is a verdict, not a blip — retrying a 403/404/409 just doubles the
 * request volume (and the Neon CPU bill) without ever changing the answer.
 * 408 and 429 are the exceptions: both explicitly invite a retry. A response
 * that failed its contract is the same kind of verdict: the same endpoint will
 * return the same malformed body, so a retry only delays the error state.
 */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  if (isContractViolation(error)) return false;
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
        throwOnError: readErrorReachesBoundary,
        queryKeyHashFn: scopedQueryKeyHashFn(scope),
      },
      mutations: {
        retry: 0,
        throwOnError: false,
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
      <OrgStorageScopeProvider scope={scope}>
        <TooltipProvider delayDuration={200} skipDelayDuration={300}>
          {children}
        </TooltipProvider>
      </OrgStorageScopeProvider>
    </QueryClientProvider>
  );
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? "";
  const orgId = session?.orgId ?? "";
  const scope =
    status === "authenticated"
      ? authenticatedScope(orgId, userId)
      : status === "loading"
        ? LOADING_SCOPE
        : UNAUTHENTICATED_SCOPE;

  return (
    <ScopedQueryProvider key={scope} scope={scope}>
      {children}
    </ScopedQueryProvider>
  );
}
