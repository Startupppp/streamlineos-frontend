import { z } from "zod";

/** Simple success responses — backend `channelOkSchema` / `chatMessageOkSchema`. */
export const chatOkContract = z.object({ ok: z.literal(true) });

/** `chatReactionsResponseSchema` — reactions map keyed by emoji, values are user id arrays. */
export const chatReactionsContract = z.object({
  reactions: z.record(z.string(), z.array(z.string())),
});

/** `chatSummarizeResponseSchema` */
export const chatSummarizeContract = z.object({ summary: z.string() });

/** `chatCreateTaskSchema` */
export const chatCreateTaskContract = z.object({
  ticketId: z.number().int(),
  ticketNumber: z.number().int(),
});

/** `chatAvailableActionsSchema` */
const entityActionInputSpecSchema = z.object({
  name: z.string(),
  kind: z.enum(["text", "date", "user", "choice"]),
  required: z.boolean(),
  choices: z.array(z.string()).optional(),
  options: z.object({ from: z.object({ type: z.string(), id: z.string() }) }).optional(),
});

export const chatEntityActionsContract = z.object({
  references: z.array(
    z.object({
      reference: z.object({ type: z.string(), id: z.string() }),
      actions: z.array(z.object({
        id: z.string(),
        label: z.string(),
        inputs: z.array(entityActionInputSpecSchema),
      })),
    }),
  ),
});

/** `chatActionOptionsSchema` */
export const chatEntityActionOptionsContract = z.object({
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    imageUrl: z.string().nullable().optional(),
  })),
});

/** `chatSubmitActionSchema` */
export const chatSubmitActionContract = z.object({ success: z.literal(true) });
