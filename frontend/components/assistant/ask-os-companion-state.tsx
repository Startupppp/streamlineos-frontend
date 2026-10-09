"use client";

import { createContext, useContext } from "react";
import type { AskAiHistoryMessage } from "@/hooks/api/chat-ai-assistant";
import {
  useConfirmActionActivity,
  type ConfirmActionActivity,
} from "@/hooks/api/ai-confirm-action";
import type { AiFailureState } from "@/components/ai";
import {
  directivesOf,
  extractAskOsDirective,
  type AskOsDirective,
  type AskOsDirectiveOf,
} from "./ask-os-directive-schema";

export type AskOsCompanionState =
  | "idle"
  | "thinking"
  | "clarification"
  | "partial-evidence"
  | "proposal-ready"
  | "confirmation-pending"
  | "success"
  | "conflict"
  | "denied"
  | "disconnected"
  | "failed"
  | "stopped";

const COMPANION_STATUS_TEXT: Record<AskOsCompanionState, string> = {
  idle: "Ready",
  thinking: "Working on your request",
  clarification: "Waiting for you to choose an option",
  "partial-evidence": "Answered, but some sources were incomplete",
  "proposal-ready": "A proposal is ready for your review",
  "confirmation-pending": "Confirming the action",
  success: "Action completed",
  conflict: "The proposal changed or expired. Nothing was saved",
  denied: "Not allowed",
  disconnected: "A connection is needed",
  failed: "Something went wrong",
  stopped: "Stopped",
};

const RECEIPT_STATE: Record<AskOsDirectiveOf<"action-receipt">["status"], AskOsCompanionState> = {
  committed: "success",
  "already-completed": "success",
  conflicted: "conflict",
  expired: "conflict",
  denied: "denied",
  failed: "failed",
};

function failureState(failure: AiFailureState): AskOsCompanionState {
  if (failure.status === "cancelled") return "stopped";
  if (failure.status === "offline") return "disconnected";
  if (failure.status === "denied") return "denied";
  return "failed";
}

function confirmState(confirm: ConfirmActionActivity): AskOsCompanionState {
  if (confirm.status === "pending") return "confirmation-pending";
  if (confirm.status === "success")
    return confirm.receipt ? RECEIPT_STATE[confirm.receipt.status] : "success";
  if (confirm.errorStatus === 409 || confirm.errorStatus === 410) return "conflict";
  if (confirm.errorStatus === 403) return "denied";
  return "failed";
}

function directiveState(directives: AskOsDirective[]): AskOsCompanionState {
  const receipts = directivesOf(directives, "action-receipt");
  const lastReceipt = receipts[receipts.length - 1];
  if (lastReceipt) return RECEIPT_STATE[lastReceipt.status];
  if (directives.some((d) => d.kind === "clarify")) return "clarification";
  if (directivesOf(directives, "confirm-action").some((d) => d.token !== undefined)) return "proposal-ready";
  const limit = directivesOf(directives, "capability-limit")[0];
  if (limit) return limit.reason === "needs-connection" ? "disconnected" : "denied";
  if (directives.some((d) => d.kind === "connect-integration")) return "disconnected";
  const partial = directivesOf(directives, "evidence").some((d) =>
    d.sources.some((source) => source.status !== "ok" && source.status !== "empty"),
  );
  return partial ? "partial-evidence" : "idle";
}

interface AskOsPanelStateInput {
  draft: { assistant: string } | null;
  failure: AiFailureState | null;
  directives: AskOsDirective[];
  persisted: AskAiHistoryMessage[];
}

export function deriveAskOsCompanionState(
  { draft, failure, directives, persisted }: AskOsPanelStateInput,
  confirm: ConfirmActionActivity,
): AskOsCompanionState {
  if (failure) return failureState(failure);
  if (confirm.status === "pending") return "confirmation-pending";
  if (draft) return directives.length > 0 ? directiveState(directives) : "thinking";
  const last = persisted[persisted.length - 1];
  const lastAt = last ? Date.parse(last.createdAt) : 0;
  if (confirm.status !== "idle" && confirm.submittedAt > lastAt) return confirmState(confirm);
  if (!last || last.role !== "assistant") return "idle";
  return directiveState(extractAskOsDirective(last.content).directives);
}

export function useAskOsPanelState(input: AskOsPanelStateInput): AskOsCompanionState {
  return deriveAskOsCompanionState(input, useConfirmActionActivity());
}

export const AskOsCompanionStateContext = createContext<AskOsCompanionState>("idle");

export function useAskOsCompanionState(): AskOsCompanionState {
  return useContext(AskOsCompanionStateContext);
}

export function AskOsStatusText({ state }: { state: AskOsCompanionState }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={state === "idle" ? "sr-only" : "px-3 pb-1 text-micro text-muted-foreground"}
    >
      {COMPANION_STATUS_TEXT[state]}
    </p>
  );
}
