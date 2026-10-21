const SNIPPET_LIMIT = 60;

export function messageDeleteTitle(
  senderName: string,
  content: string | null | undefined,
): string {
  const text = (content ?? "").replace(/\s+/g, " ").trim();
  if (!text) return `Delete this attachment from ${senderName}?`;
  const snippet =
    text.length > SNIPPET_LIMIT ? `${text.slice(0, SNIPPET_LIMIT).trimEnd()}…` : text;
  return `Delete message from ${senderName}: "${snippet}"?`;
}
