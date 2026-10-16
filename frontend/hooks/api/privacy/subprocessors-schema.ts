import { z } from "zod";

/** `subscribeResponseSchema` / `unsubscribeResponseSchema` — the act, not the row. */
export const subprocessorSubscribeContract = z.object({ subscribed: z.literal(true) });
export const subprocessorUnsubscribeContract = z.object({ unsubscribed: z.literal(true) });
