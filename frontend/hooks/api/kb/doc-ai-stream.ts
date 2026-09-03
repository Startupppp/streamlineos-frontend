"use client";

import { streamAiText, type AiTextStreamResult } from "@/hooks/api/ai-text-stream";

/**
 * The four AI actions a KB document surface offers, and the two document kinds
 * that offer them. The names are the backend's route segments verbatim
 * (`kbDocAiActionSchema`), so a rename on either side is a compile error here
 * rather than a 404 at the moment a user presses the button.
 */
export type KbDocAiAction = "summarize" | "ask" | "improve" | "suggest-related";
export type KbDocAiScope = "pages" | "articles";

export interface KbDocAiStreamRequest {
  scope: KbDocAiScope;
  docId: number;
  action: KbDocAiAction;
  question?: string;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

/**
 * Streams one KB document action. `improve` declares a 1024-token ceiling on the
 * backend, which a buffered call could not deliver inside the client's own cap —
 * the whole answer had to arrive before anything rendered, and a long rewrite was
 * killed by the client and offered back as a retry the user paid for twice.
 * Streaming removes that exposure: the first token lands immediately and the
 * server's deadline is the only one that ends the answer.
 */
export function streamKbDocAi({
  scope,
  docId,
  action,
  question,
  onToken,
  signal,
}: KbDocAiStreamRequest): Promise<AiTextStreamResult> {
  return streamAiText({
    path: `/kb/${scope}/${docId}/ai/${action}/stream`,
    body: action === "ask" ? { question: question ?? "" } : {},
    ...(onToken !== undefined ? { onToken } : {}),
    ...(signal !== undefined ? { signal } : {}),
  });
}
