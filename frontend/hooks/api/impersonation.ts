"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { apiClient } from "@/lib/api-client";
import {
  setImpersonationToken,
  setAutoSignOutSuppressed,
  clearBackendTokenCache,
} from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useSessionClaimsRefresh } from "@/hooks/common/auth-hooks";

const startImpersonationContract = lazyContract(() =>
  import("@/hooks/api/impersonation-schema").then((m) => m.startImpersonationResponseContract),
);

const stopImpersonationContract = lazyContract(() =>
  import("@/hooks/api/impersonation-schema").then((m) => m.stopImpersonationResponseContract),
);

export interface ImpersonationTargetUser {
  id: string;
  name: string | null;
  email: string;
}

export function useStartImpersonation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const refreshSessionClaims = useSessionClaimsRefresh();
  const generationRef = useRef(0);

  return useMutation({
    mutationKey: ["impersonation", "start"],
    mutationFn: (targetUserId: string) =>
      apiClient.post(
        "/impersonation/start",
        { targetUserId },
        undefined,
        startImpersonationContract,
      ),
    onMutate: async () => {
      generationRef.current += 1;
      const generation = generationRef.current;
      setAutoSignOutSuppressed(true);
      await queryClient.cancelQueries();
      return { generation };
    },
    onSuccess: async (data, _vars, ctx) => {
      if (ctx.generation !== generationRef.current) return;
      setImpersonationToken(data.token, data.targetUser, data.impersonationSessionId);
      queryClient.clear();
      router.replace("/dashboard");
      router.refresh();
    },
    onError: () => {
      setAutoSignOutSuppressed(false);
    },
  });
}

export function useStopImpersonation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const refreshSessionClaims = useSessionClaimsRefresh();
  const generationRef = useRef(0);

  return useMutation({
    mutationKey: ["impersonation", "stop"],
    mutationFn: (impersonationSessionId: string) =>
      apiClient.delete(
        `/impersonation/stop/${impersonationSessionId}`,
        undefined,
        undefined,
        stopImpersonationContract,
      ),
    onMutate: async () => {
      generationRef.current += 1;
      const generation = generationRef.current;
      setAutoSignOutSuppressed(true);
      await queryClient.cancelQueries();
      return { generation };
    },
    onSuccess: async (_data, _vars, ctx) => {
      if (ctx.generation !== generationRef.current) return;
      setImpersonationToken(null, null);
      clearBackendTokenCache();
      await refreshSessionClaims();
      queryClient.clear();
      router.replace("/settings/roles/simulate");
      router.refresh();
    },
    onError: () => {
      setAutoSignOutSuppressed(false);
    },
  });
}
