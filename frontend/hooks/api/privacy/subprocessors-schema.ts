import { z } from "zod";

export const subprocessorSubscribeContract = z.object({ subscribed: z.literal(true) });
export const subprocessorUnsubscribeContract = z.object({ unsubscribed: z.literal(true) });
