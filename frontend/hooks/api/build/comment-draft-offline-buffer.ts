const BUFFER_KEY = "slos:comment-draft-pending";

function safeRead(): Record<string, string> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(BUFFER_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") result[k] = v;
    }
    return result;
  } catch {
    return {};
  }
}

function safeWrite(buffer: Record<string, string>): void {
  try {
    if (typeof window === "undefined") return;
    if (Object.keys(buffer).length === 0) {
      localStorage.removeItem(BUFFER_KEY);
    } else {
      localStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));
    }
  } catch { /* storage unavailable */ }
}

export function bufferDraft(ticketId: number, body: string): void {
  const buffer = safeRead();
  buffer[String(ticketId)] = body;
  safeWrite(buffer);
}

export function drainBuffer(): Array<{ ticketId: number; body: string }> {
  const buffer = safeRead();
  safeWrite({});
  return Object.entries(buffer).map(([id, body]) => ({
    ticketId: Number(id),
    body,
  }));
}

export function peekBuffer(): Array<{ ticketId: number; body: string }> {
  return Object.entries(safeRead()).map(([id, body]) => ({
    ticketId: Number(id),
    body,
  }));
}

export function clearBuffer(): void {
  safeWrite({});
}
