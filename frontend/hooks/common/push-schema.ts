import { z } from "zod";

export const pushSubscribeContract = z.object({
  success: z.literal(true),
});

export const pushUnsubscribeContract = z.object({
  success: z.literal(true),
});

export const vapidPublicKeyContract = z.object({
  key: z.string(),
});
