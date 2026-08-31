import { z } from "zod";

const notificationSchema = z.object({
  id: z.number(),
  title: z.string(),
  message: z.string(),
  priority: z.string(),
  category: z.string(),
  link: z.string().nullable().optional(),
  eventKey: z.string().nullable().optional(),
});

const frameSchema = z.object({
  type: z.string().optional(),
  notification: notificationSchema.optional(),
});

export type IncomingNotification = z.infer<typeof notificationSchema>;

export async function consumeNotificationStream(
  url: string,
  token: string,
  signal: AbortSignal,
  onNotification: (notification: IncomingNotification) => void,
): Promise<void> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
    signal,
  });
  if (!response.ok || !response.body) throw new Error("Notification stream unavailable");
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (!signal.aborted) {
    const result = await reader.read();
    if (result.done) return;
    buffer += result.value;
    const frames = buffer.split(/\n\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const data = frame.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim();
      if (!data) continue;
      const parsed = frameSchema.safeParse(JSON.parse(data));
      if (parsed.success && parsed.data.type === "notification" && parsed.data.notification)
        onNotification(parsed.data.notification);
    }
  }
}
