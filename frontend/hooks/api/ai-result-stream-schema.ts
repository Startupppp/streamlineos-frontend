import { z } from "zod";

export const aiResultFrameSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("result"), data: z.unknown() }),
]);

export const aiResultUsageSchema = z.object({
  model: z.string().nullable().optional(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  credits: z.number(),
  costUsd: z.number().nullable().optional(),
});
