import { z } from "zod";
import { withCorrelation } from "@/lib/observability/with-correlation";
import { reportError } from "@/lib/observability/error-reporter";

const notificationSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

const frameSchema = z.object({
  type: z.string().optional(),
  notification: z.unknown().optional(),
});

export type IncomingNotification = z.infer<typeof notificationSchema>;

export interface NotificationStreamHandlers {
  onOpen?: () => void;
  onCountChanged?: () => void;
}

export async function consumeNotificationStream(
  url: string,
  token: string,
  signal: AbortSignal,
  onNotification: (notification: IncomingNotification) => void,
  { onOpen, onCountChanged }: NotificationStreamHandlers = {},
): Promise<void> {
  const headers = withCorrelation(new Headers({ Accept: "text/event-stream" }));
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { headers, signal });
  if (!response.ok || !response.body)
    throw new Error("Notification stream unavailable");
  onOpen?.();
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (!signal.aborted) {
    const result = await reader.read();
    if (result.done) return;
    buffer += result.value;
    const frames = buffer.split(/\n\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const data = frame
        .split("\n")
        .find((line) => line.startsWith("data:"))
        ?.slice(5)
        .trim();
      if (!data) continue;
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(data);
      } catch (err) {
        reportError(err);
        continue;
      }
      const parsed = frameSchema.safeParse(rawJson);
      if (!parsed.success) continue;
      if (parsed.data.type === "notification") {
        const hint = notificationSchema.safeParse(parsed.data.notification);
        if (hint.success) onNotification(hint.data);
        continue;
      }
      if (parsed.data.type === "count_changed") onCountChanged?.();
    }
  }
}
