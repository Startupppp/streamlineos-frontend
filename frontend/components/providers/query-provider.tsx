"use client";

import "@/lib/dom-mutation-guard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isApiError } from "@/lib/api-client";

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

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createAppQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
