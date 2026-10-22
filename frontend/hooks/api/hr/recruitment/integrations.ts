"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type {
  integrationStatusContract,
  rotateInboundSecretContract,
} from "@/hooks/api/hr/recruitment/integrations-schema";

const integrationsListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/integrations-schema").then((m) => m.integrationsListContract),
);
const integrationStatusC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/integrations-schema").then((m) => m.integrationStatusContract),
);
const disconnectIntegrationC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/integrations-schema").then(
    (m) => m.disconnectIntegrationContract,
  ),
);
const rotateInboundSecretC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/integrations-schema").then(
    (m) => m.rotateInboundSecretContract,
  ),
);

export type RecruitmentIntegration = z.infer<typeof integrationStatusContract>;
export type RotatedInboundSecret = z.infer<typeof rotateInboundSecretContract>;

export interface ConnectIntegrationInput {
  platform: string;
  token?: string | null;
  isActive?: boolean;
  meta?: Record<string, unknown>;
}

const integrationsKey = ["hr", "recruitment", "integrations"] as const;

export function useRecruitmentIntegrations() {
  return useGatedQuery("hr:requisitions:manage", {
    queryKey: integrationsKey,
    queryFn: ({ signal }) =>
      apiClient.get<RecruitmentIntegration[]>(
        "/hr/recruitment/integrations",
        undefined,
        signal,
        integrationsListC,
      ),
    staleTime: 60_000,
  });
}

export function useConnectIntegration() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "integrations", "connect"],
    mutationFn: ({ platform, ...body }: ConnectIntegrationInput) =>
      apiClient.put<RecruitmentIntegration>(
        `/hr/recruitment/integrations/${platform}`,
        body,
        undefined,
        integrationStatusC,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationsKey }),
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "integrations", "disconnect"],
    mutationFn: (platform: string) =>
      apiClient.delete<{ platform: string }>(
        `/hr/recruitment/integrations/${platform}`,
        undefined,
        undefined,
        disconnectIntegrationC,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationsKey }),
  });
}

export function useRotateInboundSecret() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "integrations", "inbound-secret"],
    mutationFn: (platform: string, idempotencyKey: string) =>
      apiClient.post<RotatedInboundSecret>(
        `/hr/recruitment/integrations/${platform}/inbound-secret`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
        rotateInboundSecretC,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationsKey }),
  });
}
