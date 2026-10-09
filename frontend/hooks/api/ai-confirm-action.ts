import { apiClient } from "@/lib/api-client";
import { isApiError, lazyContract } from "@/lib/api-envelope";
import { useMutationState } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { getErrorStatus } from "@/lib/get-error-message";
import {
  askOsActionReceiptSchema,
  type AskOsActionReceipt,
} from "@/components/assistant/ask-os-directive-schema";

const confirmActionContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.confirmActionContract),
);

const declineProposalContract = lazyContract(() =>
  import("@/hooks/api/ai-schema").then((m) => m.declineProposalContract),
);

export interface ConfirmActionResult {
  ok: boolean;
  result: Record<string, unknown>;
  summary: string;
  receipt?: AskOsActionReceipt;
}

const CONFIRM_ACTION_MUTATION_KEY = ["aiChat", "confirmAction"];

export function refusedConfirmOutcome(error: unknown): ConfirmActionResult | undefined {
  if (!isApiError(error)) return undefined;
  const details = error.details;
  if (typeof details !== "object" || details === null || !("receipt" in details)) return undefined;
  const parsed = askOsActionReceiptSchema.safeParse(details.receipt);
  if (!parsed.success) return undefined;
  return { ok: false, result: {}, summary: parsed.data.summary, receipt: parsed.data };
}

export interface ConfirmActionActivity {
  status: "idle" | "pending" | "success" | "error";
  submittedAt: number;
  receipt?: AskOsActionReceipt;
  errorStatus?: number;
}

const IDLE_ACTIVITY: ConfirmActionActivity = { status: "idle", submittedAt: 0 };

export function useConfirmActionActivity(): ConfirmActionActivity {
  const activities = useMutationState<ConfirmActionActivity>({
    filters: { mutationKey: CONFIRM_ACTION_MUTATION_KEY },
    select: (mutation) => {
      const { status, submittedAt, data, error } = mutation.state;
      const receipt =
        data && typeof data === "object" && "receipt" in data
          ? askOsActionReceiptSchema.safeParse(data.receipt)
          : null;
      return {
        status,
        submittedAt,
        receipt: receipt?.success ? receipt.data : undefined,
        errorStatus: status === "error" ? getErrorStatus(error) : undefined,
      };
    },
  });
  return activities[activities.length - 1] ?? IDLE_ACTIVITY;
}

export function useConfirmAction() {
  return useAuthorizedMutation("ai:chat:use", {
    mutationKey: CONFIRM_ACTION_MUTATION_KEY,
    mutationFn: (token: string) =>
      apiClient.post<ConfirmActionResult>("/chat/confirm", { token }, undefined, confirmActionContract),
  });
}

export function useDeclineProposal() {
  return useAuthorizedMutation("ai:chat:use", {
    mutationKey: ["aiChat", "declineProposal"],
    mutationFn: (proposalId: number) =>
      apiClient.post<{ declined: true }>(
        `/chat/proposals/${proposalId}/decline`,
        undefined,
        undefined,
        declineProposalContract,
      ),
  });
}
