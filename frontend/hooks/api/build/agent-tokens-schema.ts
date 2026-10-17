import { z } from "zod";
import {
  agentTokensCreateResponseSchema,
  agentTokensListResponseSchema,
} from "@/contracts/build-contracts.generated";

export const agentTokenCreateContract = agentTokensCreateResponseSchema;

export const agentTokenListContract = agentTokensListResponseSchema;

export type AgentToken = z.infer<typeof agentTokensListResponseSchema>[number];
export type CreateAgentTokenResponse = z.infer<typeof agentTokensCreateResponseSchema>;
