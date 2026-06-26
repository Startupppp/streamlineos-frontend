import { inngest } from "./client";


export async function dispatchWebhook(
  orgId: string,
  eventName: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await inngest.send({
      name: "webhook/dispatch" as never,
      data: { orgId, eventName, payload },
    });
  } catch {
  }
}
