"use client";
import type { z } from "zod";
import type { slackConnectionListContract as slackConnectionListContractDef } from "@/hooks/api/slack-integration-schema";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const slackConnectionListContract = lazyContract(() =>
  import("@/hooks/api/slack-integration-schema").then((m) => m.slackConnectionListContract),
);
const slackConnectionCreateContract = lazyContract(() =>
  import("@/hooks/api/slack-integration-schema").then((m) => m.slackConnectionCreateContract),
);
const slackConnectionDeleteContract = lazyContract(() =>
  import("@/hooks/api/slack-integration-schema").then((m) => m.slackConnectionDeleteContract),
);

export type SlackConnection = z.infer<typeof slackConnectionListContractDef>["data"][number];

interface CreateSlackConnectionInput {
  teamId: string;
  signingSecret: string;
  botToken: string;
  teamName?: string;
  defaultChannelId?: string;
}

interface SlackConnectionsParams {
  cursor?: string;
}

export function useSlackConnections(params?: SlackConnectionsParams) {
  const queryParams = params?.cursor ? { cursor: params.cursor } : undefined;
  return useGatedQuery("integrations:slack:view", {
    queryKey: accountingAndSupportQueryKeys.slackIntegration.connections(queryParams),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/integrations/slack/connections",
        queryParams,
        signal,
        slackConnectionListContract,
      ),
    staleTime: 60_000,
  });
}

export function useCreateSlackConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("integrations:slack:manage", {
    mutationKey: ["integrations", "slack", "create"],
    mutationFn: (input: CreateSlackConnectionInput) =>
      apiClient.post(
        "/integrations/slack/connections",
        input,
        undefined,
        slackConnectionCreateContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: accountingAndSupportQueryKeys.slackIntegration.all,
      });
    },
  });
}

export function useDeleteSlackConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("integrations:slack:manage", {
    mutationKey: ["integrations", "slack", "delete"],
    mutationFn: (connectionId: number) =>
      apiClient.delete(
        `/integrations/slack/connections/${connectionId}`,
        undefined,
        undefined,
        slackConnectionDeleteContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: accountingAndSupportQueryKeys.slackIntegration.all,
      });
    },
  });
}
