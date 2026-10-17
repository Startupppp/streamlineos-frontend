"use client";
import type { z } from "zod";
import type { emailInboundConnectionListContract as emailInboundConnectionListContractDef } from "@/hooks/api/email-inbound-integration-schema";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const emailInboundConnectionListContract = lazyContract(() =>
  import("@/hooks/api/email-inbound-integration-schema").then((m) => m.emailInboundConnectionListContract),
);
const emailInboundConnectionCreateContract = lazyContract(() =>
  import("@/hooks/api/email-inbound-integration-schema").then((m) => m.emailInboundConnectionCreateContract),
);
const emailInboundConnectionDeleteContract = lazyContract(() =>
  import("@/hooks/api/email-inbound-integration-schema").then((m) => m.emailInboundConnectionDeleteContract),
);

export type EmailInboundConnection = z.infer<typeof emailInboundConnectionListContractDef>["data"][number];
export type EmailInboundProvider = "postmark" | "mailgun" | "sendgrid";

interface CreateEmailInboundConnectionInput {
  provider: EmailInboundProvider;
  inboundAddress: string;
  signingSecret: string;
  defaultProjectId?: number;
}

interface EmailInboundConnectionsParams {
  cursor?: string;
}

export function useEmailInboundConnections(params?: EmailInboundConnectionsParams) {
  const queryParams = params?.cursor ? { cursor: params.cursor } : undefined;
  return useGatedQuery("integrations:email-inbound:view", {
    queryKey: accountingAndSupportQueryKeys.emailInboundIntegration.connections(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/integrations/email-inbound/connections",
        queryParams,
        signal,
        emailInboundConnectionListContract,
      ),
    staleTime: 60_000,
  });
}

export function useCreateEmailInboundConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("integrations:email-inbound:manage", {
    mutationKey: ["integrations", "email-inbound", "create"],
    mutationFn: (input: CreateEmailInboundConnectionInput) =>
      apiClient.post(
        "/integrations/email-inbound/connections",
        input,
        undefined,
        emailInboundConnectionCreateContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: accountingAndSupportQueryKeys.emailInboundIntegration.all,
      });
    },
  });
}

export function useDeleteEmailInboundConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("integrations:email-inbound:manage", {
    mutationKey: ["integrations", "email-inbound", "delete"],
    mutationFn: (connectionId: number) =>
      apiClient.delete(
        `/integrations/email-inbound/connections/${connectionId}`,
        undefined,
        undefined,
        emailInboundConnectionDeleteContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: accountingAndSupportQueryKeys.emailInboundIntegration.all,
      });
    },
  });
}
