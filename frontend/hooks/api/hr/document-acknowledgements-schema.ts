import { z } from "zod";

export const documentAcknowledgementContract = z.array(
  z.object({
    id: z.number().int(),
    documentId: z.number().int(),
    userId: z.string(),
    status: z.enum(["PENDING", "ACKNOWLEDGED"]),
    acknowledgedAt: z.string().nullable(),
    createdAt: z.string(),
    document: z
      .object({
        id: z.number().int(),
        name: z.string(),
        description: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        hasFile: z.boolean().optional(),
        fileName: z.string().nullable().optional(),
        version: z.number().int().nullable().optional(),
      })
      .passthrough()
      .nullable(),
    user: z
      .object({ id: z.string(), name: z.string().nullable() })
      .nullable()
      .optional(),
  }),
);

export const acknowledgeDocumentContract = z.object({ success: z.literal(true) });
