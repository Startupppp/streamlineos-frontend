"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const subscribeC = lazyContract(() => import("@/hooks/api/privacy/subprocessors-schema").then((m) => m.subprocessorSubscribeContract));
const unsubscribeC = lazyContract(() => import("@/hooks/api/privacy/subprocessors-schema").then((m) => m.subprocessorUnsubscribeContract));

export function useSubprocessorNotices() {
  return useMutation<void, Error, { email: string; subscribe: boolean }>({
    mutationKey: ["privacy", "subprocessors", "subscription"],
    mutationFn: async ({ email, subscribe }) => {
      if (subscribe) await apiClient.post("/compliance/subprocessors/subscribe", { email }, undefined, subscribeC);
      else await apiClient.post("/compliance/subprocessors/unsubscribe", { email }, undefined, unsubscribeC);
    },
  });
}
