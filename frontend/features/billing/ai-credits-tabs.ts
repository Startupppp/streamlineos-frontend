export type AiCreditsTab = "usage" | "buy" | "history";

export const AI_CREDITS_TABS: readonly AiCreditsTab[] = ["usage", "buy", "history"];

export function resolveAiCreditsTab(raw: string | null | undefined): AiCreditsTab {
  return AI_CREDITS_TABS.find((candidate) => candidate === raw) ?? "usage";
}
