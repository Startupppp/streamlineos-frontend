import { isRecord } from "@/lib/is-record";

export const AI_UI_MESSAGE_STREAM_HEADER = "x-vercel-ai-ui-message-stream";

const DATA_FIELD = "data:";
const TERMINATOR = "[DONE]";

export type AiUiMessageStreamEvent =
  | { type: "text"; text: string }
  | { type: "error"; message: string };

export function isAiUiMessageStream(headers: Headers | undefined): boolean {
  if (!headers) return false;
  if (headers.get(AI_UI_MESSAGE_STREAM_HEADER)) return true;
  return (headers.get("content-type") ?? "").includes("text/event-stream");
}

export interface AiUiMessageStreamDecoder {
  decode(chunk: string): AiUiMessageStreamEvent[];
  flush(): AiUiMessageStreamEvent[];
}

function readFrame(payload: string): AiUiMessageStreamEvent | null {
  if (payload === TERMINATOR) return null;

  let frame: unknown;
  try {
    frame = JSON.parse(payload);
  } catch {
    return null;
  }

  if (!isRecord(frame)) return null;
  if (frame.type === "text-delta" && typeof frame.delta === "string")
    return { type: "text", text: frame.delta };
  if (frame.type === "error" && typeof frame.errorText === "string")
    return { type: "error", message: frame.errorText };
  return null;
}

export function createAiUiMessageStreamDecoder(): AiUiMessageStreamDecoder {
  let buffered = "";

  function readLine(line: string): AiUiMessageStreamEvent | null {
    const field = line.endsWith("\r") ? line.slice(0, -1) : line;
    if (!field.startsWith(DATA_FIELD)) return null;
    return readFrame(field.slice(DATA_FIELD.length).trim());
  }

  return {
    decode(chunk) {
      buffered += chunk;
      const events: AiUiMessageStreamEvent[] = [];
      for (;;) {
        const newline = buffered.indexOf("\n");
        if (newline === -1) break;
        const event = readLine(buffered.slice(0, newline));
        if (event) events.push(event);
        buffered = buffered.slice(newline + 1);
      }
      return events;
    },
    flush() {
      if (!buffered) return [];
      const event = readLine(buffered);
      buffered = "";
      return event ? [event] : [];
    },
  };
}
