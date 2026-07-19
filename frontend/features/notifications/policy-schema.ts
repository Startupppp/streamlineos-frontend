import { z } from "zod";

export const policySchema = z.object({
  enabled: z.boolean(),
  defaultPriority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  defaultChannels: z.array(z.enum(["IN_APP", "EMAIL", "PUSH", "SMS", "WHATSAPP", "WEBHOOK"])),
  quietHoursBehavior: z.enum(["respect", "bypass_if_high", "always_bypass"]),
  dedupeWindowSeconds: z.string(),
  rateLimitWindowSeconds: z.string(),
  rateLimitMax: z.string(),
});

export type PolicyFormValues = z.infer<typeof policySchema>;
