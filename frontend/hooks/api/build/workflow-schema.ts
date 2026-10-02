import {
  workflowCreateTransitionResponseSchema,
  workflowListTransitionsResponseSchema,
  workflowUpdateWipLimitResponseSchema,
} from "@/contracts/build-contracts.generated";

export const workflowTransitionContract = workflowCreateTransitionResponseSchema;

export const workflowTransitionListContract = workflowListTransitionsResponseSchema;

export const projectStatusContract = workflowUpdateWipLimitResponseSchema;
