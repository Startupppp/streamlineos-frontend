import type { LucideIcon } from "lucide-react";
import type { AiActionResult, AiActionResultState } from "./ai-action-result-body";
import type { AiInlineSession } from "./ai-inline-preview";

export type AiResultSurface = "inline" | "popover" | "sheet" | "dialog";

export interface AiAction {
  key: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  run: (
    signal?: AbortSignal,
    onToken?: (chunk: string) => void,
  ) => Promise<AiActionResult>;
  onApply?: (text: string) => void;
  applyLabel?: string;
  surface?: AiResultSurface;
  expectsCitations?: boolean;
  disabledReason?: string;
  onInlineChange?: (session: AiInlineSession | null) => void;
}

export function resolveSurface(
  action: AiAction,
  defaultSurface?: AiResultSurface,
): AiResultSurface {
  return action.surface ?? defaultSurface ?? "popover";
}

export function buildInlineSession(
  action: AiAction,
  state: AiActionResultState,
  handlers: {
    apply: () => void;
    reject: () => void;
    retry: () => void;
    cancel: () => void;
  },
): AiInlineSession {
  return {
    actionKey: action.key,
    expectsCitations: action.expectsCitations ?? false,
    state,
    apply: handlers.apply,
    reject: handlers.reject,
    retry: handlers.retry,
    cancel: handlers.cancel,
  };
}
