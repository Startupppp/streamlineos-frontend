import { z } from "zod";

export const providerSchema = z.object({
  channel: z.enum([
    "IN_APP",
    "EMAIL",
    "PUSH",
    "SMS",
    "WHATSAPP",
    "WEBHOOK",
  ]),
  provider: z.enum([
    "SMTP",
    "TWILIO",
    "META_WHATSAPP",
    "WEBHOOK",
    "WEB_PUSH",
    "INTERNAL",
    "SANDBOX",
  ]),
  displayName: z.string().min(1, "Display name is required"),
  config: z.string().optional(),
  enabled: z.boolean(),
  sandboxMode: z.boolean(),
  isDefault: z.boolean(),
  dailySendLimit: z
    .string()
    .optional()
    .refine((val) => !val || !val.trim() || Number(val.trim()) >= 0, {
      message: "Must be 0 or more",
    }),
  monthlyCostLimit: z.string().optional(),
});

export type ProviderFormValues = z.infer<typeof providerSchema>;
