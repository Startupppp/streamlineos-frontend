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
import { clearStreamToken } from "@/features/notifications/use-notification-events";

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
    onSuccess: (data, _vars, ctx) => {
      if (ctx.generation !== generationRef.current) return;
      setImpersonationToken(
        data.token,
        data.targetUser,
        data.impersonationSessionId,
        data.expiresAt,
      );
      clearStreamToken();
      queryClient.clear();
      router.replace("/dashboard");
      router.refresh();
    },
    onError: () => {
      setAutoSignOutSuppressed(false);
    },
    onSettled: (_data, _error, _vars, ctx) => {
      if (ctx?.generation !== generationRef.current) return;
      setAutoSignOutSuppressed(false);
    },
  });
}

export function useStopImpersonation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const generationRef = useRef(0);

  return useMutation({
    mutationKey: ["impersonation", "stop"],
    mutationFn: (impersonationSessionId: string) =>
      apiClient.delete(
        `/impersonation/stop/${impersonationSessionId}`,
        undefined,
        { asRealUser: true },
        stopImpersonationContract,
      ),
    onMutate: async () => {
      generationRef.current += 1;
      const generation = generationRef.current;
      setAutoSignOutSuppressed(true);
      await queryClient.cancelQueries();
      return { generation };
    },
    onSettled: (_data, _error, _vars, ctx) => {
      if (ctx?.generation !== generationRef.current) return;
      setImpersonationToken(null, null);
      clearBackendTokenCache();
      clearStreamToken();
      setAutoSignOutSuppressed(false);
      queryClient.clear();
      router.replace("/settings/roles/simulate");
      router.refresh();
    },
  });
}
