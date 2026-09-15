"use client";

import "@/lib/dom-mutation-guard";
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isApiError } from "@/lib/api-client";
import { isContractViolation } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { registerQueryCacheClearer } from "@/lib/query-cache-control";
import { queryRetryDelay, readErrorReachesBoundary } from "@/lib/query-error-policy";
import {
  LOADING_SCOPE,
  UNAUTHENTICATED_SCOPE,
  authenticatedScope,
  scopedQueryKeyHashFn,
} from "@/lib/query-scope";
import { OrgStorageScopeProvider } from "@/lib/org-scoped-storage";
import {
  publishBuildCacheChange,
  subscribeBuildCacheSync,
} from "@/lib/build-cache-sync";

const MAX_QUERY_RETRIES = 1;

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

function carriesAiCharge(data: unknown): boolean {
  if (typeof data !== "object" || data === null || !("aiUsage" in data))
    return false;
  const usage = data.aiUsage;
  if (typeof usage !== "object" || usage === null || !("credits" in usage))
    return false;
  const credits = usage.credits;
  return typeof credits === "number" && credits > 0;
}

export function createAppQueryClient(scope = "unscoped"): QueryClient {
  const mutationCache = new MutationCache({
    onSuccess: (...args) => {
      const [data, , , mutation] = args;
      publishBuildCacheChange(client, scope, mutation.options.meta);
      if (!carriesAiCharge(data)) return;
      void client.invalidateQueries({
        queryKey: growthAndSignQueryKeys.billing.aiCredits(),
      });
    },
  });

  const client = new QueryClient({
    mutationCache,
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        retryDelay: queryRetryDelay,
        throwOnError: readErrorReachesBoundary,
        queryKeyHashFn: scopedQueryKeyHashFn(scope),
      },
      mutations: {
        retry: 0,
        throwOnError: false,
      },
    },
  });

  return client;
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
    () => subscribeBuildCacheSync(queryClient, scope),
    [queryClient, scope],
  );

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
    orgId && userId
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
