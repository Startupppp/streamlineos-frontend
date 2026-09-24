import { z } from "zod";

const fieldDocSchema = z.object({
  field: z.string(),
  label: z.string(),
  type: z.enum(["string", "number", "boolean", "date"]).optional(),
});

export const sandboxEventSchema = z.object({
  value: z.string(),
  fields: z.array(fieldDocSchema),
  samplePayload: z.record(z.string(), z.unknown()),
  exampleSecret: z.string(),
  exampleBody: z.string(),
  exampleSignature: z.string(),
});

export const sandboxCatalogueSchema = z.object({
  signatureHeader: z.string(),
  eventHeader: z.string(),
  timestampHeader: z.string(),
  algorithm: z.string(),
  events: z.array(sandboxEventSchema),
});

export const directorySyncSchema = z.array(
  z.object({
    capability: z.enum(["SSO", "SCIM"]),
    provider: z.object({
      provider: z.string(),
      status: z.literal("BLOCKED"),
      code: z.string(),
      message: z.string(),
    }),
    availableToday: z.string(),
  }),
);

export const sandboxDeliverySchema = z.object({
  deliveryId: z.number().int(),
  subscriptionId: z.number().int(),
  subscriptionName: z.string(),
  event: z.string(),
  status: z.string(),
  attempts: z.number().int(),
  responseStatus: z.number().int().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
});

export const sandboxDeliveryListSchema = z.array(sandboxDeliverySchema);

export const sandboxReplayResultSchema = z.object({
  deliveryId: z.number().int(),
  event: z.string(),
  queued: z.boolean(),
  note: z.string(),
});

export type SandboxCatalogue = z.infer<typeof sandboxCatalogueSchema>;
export type SandboxEvent = z.infer<typeof sandboxEventSchema>;
export type SandboxDelivery = z.infer<typeof sandboxDeliverySchema>;
export type DirectorySyncEntry = z.infer<typeof directorySyncSchema>[number];
