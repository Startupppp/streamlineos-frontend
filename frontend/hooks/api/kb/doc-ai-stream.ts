"use client";

import { streamAiText, type AiStreamCitation, type AiTextStreamResult } from "@/hooks/api/ai-text-stream";
import { kbPageSourcesEventContract } from "./kb-ai-schema";

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

export async function streamKbDocAi({
  scope,
  docId,
  action,
  question,
  onToken,
  signal,
}: KbDocAiStreamRequest): Promise<AiTextStreamResult> {
  const collected: AiStreamCitation[] = [];

  function handleData(name: string, data: unknown): void {
    if (name !== "kb-page-sources") return;
    const parsed = kbPageSourcesEventContract.safeParse(data);
    if (!parsed.success) return;
    for (const source of parsed.data) {
      collected.push({ id: source.id, title: source.title });
    }
  }

  const outcome = await streamAiText({
    path: `/kb/${scope}/${docId}/ai/${action}/stream`,
    body: action === "ask" ? { question: question ?? "" } : {},
    onData: handleData,
    ...(onToken !== undefined ? { onToken } : {}),
    ...(signal !== undefined ? { signal } : {}),
  });

  if (outcome.status !== "completed" || collected.length === 0) return outcome;
  return { ...outcome, citations: collected };
}
