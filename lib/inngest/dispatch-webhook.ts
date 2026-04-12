import { inngest } from "./client";

/**
 * Fire-and-forget: sends a webhook/dispatch event to Inngest.
 * The webhook-dispatcher function handles retry logic via Inngest's built-in retries.
 */
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
    // Non-critical: don't fail the main request if webhook dispatch fails
  }
}
