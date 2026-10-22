import { z } from "zod";

export const chatOkContract = z.object({ ok: z.literal(true) });

export const chatReactionsContract = z.object({
  reactions: z.record(z.string(), z.array(z.string())),
});

export const chatSummarizeContract = z.object({ summary: z.string() });

export const chatCreateTaskContract = z.object({
  ticketId: z.number().int(),
  ticketNumber: z.number().int(),
});

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

export const chatEntityActionOptionsContract = z.object({
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    imageUrl: z.string().nullable().optional(),
  })),
});

export const chatSubmitActionContract = z.object({ success: z.literal(true) });
