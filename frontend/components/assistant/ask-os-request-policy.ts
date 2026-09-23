import { getErrorMessage, isValidationRefusal } from "@/lib/get-error-message";

export type PersonaId =
  | "support"
  | "sales"
  | "hr-policy"
  | "project"
  | "operations";

export const ASK_OS_MAX_MESSAGE_CHARS = 10_000;

const MAX_CONTEXT_MESSAGES = 20;
const MAX_CONTEXT_CHARS = 24_000;

export function askOsInputError(text: string): string | null {
  const length = text.trim().length;
  if (length <= ASK_OS_MAX_MESSAGE_CHARS) return null;
  return `Message is too long (${length.toLocaleString()} / ${ASK_OS_MAX_MESSAGE_CHARS.toLocaleString()} characters).`;
}

export function prepareAskOsSend(
  raw: string,
):
  | { status: "empty" }
  | { status: "invalid"; error: string }
  | { status: "ready"; text: string } {
  const text = raw.trim();
  if (!text) return { status: "empty" };
  const error = askOsInputError(text);
  if (error) return { status: "invalid", error };
  return { status: "ready", text };
}

export function askOsComposerRefusal(error: unknown): string | null {
  if (!isValidationRefusal(error)) return null;
  const message = getErrorMessage(error);
  if (/messages\.\d+\.content/i.test(message))
    return `Each message can be at most ${ASK_OS_MAX_MESSAGE_CHARS.toLocaleString()} characters.`;
  if (/^validation failed\.?$/i.test(message))
    return "This message could not be sent. Check the text and try again.";
  return message;
}

export function boundedAskOsContext<T extends { content: string }>(
  messages: readonly T[],
): T[] {
  const selected: T[] = [];
  let remaining = MAX_CONTEXT_CHARS;

  for (
    let index = messages.length - 1;
    index >= 0 && selected.length < MAX_CONTEXT_MESSAGES;
    index -= 1
  ) {
    const message = messages[index];
    if (!message || remaining === 0) break;
    const content = message.content.slice(
      0,
      Math.min(remaining, ASK_OS_MAX_MESSAGE_CHARS),
    );
    remaining -= content.length;
    selected.push(content === message.content ? message : { ...message, content });
  }

  return selected.reverse();
}
