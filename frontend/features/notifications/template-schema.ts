import { z } from "zod";
import { NOTIFICATION_CATEGORY_VALUES } from "@/lib/notification-types";

export const templateSchema = z.object({
  templateKey: z.string().min(1).regex(/^[a-z0-9_.-]+$/, "Lowercase letters, numbers, dashes, dots only"),
  name: z.string().min(1, "Name is required"),
  channel: z.enum(["IN_APP", "EMAIL", "PUSH", "SMS", "WHATSAPP", "WEBHOOK"]),
  category: z.union([z.enum(NOTIFICATION_CATEGORY_VALUES), z.literal("none")]).optional(),
  locale: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1, "Body is required"),
  variables: z.string().optional(),
});

export type TemplateFormValues = z.infer<typeof templateSchema>;

/** Test send: one member, plus a value per declared variable (aligned by index). */
export const templateTestSendSchema = z.object({
  recipientId: z.string().nullable().refine((id) => !!id, "Choose who receives the test"),
  values: z.array(z.string()),
});

export type TemplateTestSendValues = z.output<typeof templateTestSendSchema>;
