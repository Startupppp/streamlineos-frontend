import { z } from "zod";
import { NOTIFICATION_CATEGORY_VALUES } from "./notification-types";

export const broadcastSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  category: z.enum(NOTIFICATION_CATEGORY_VALUES),
  audienceType: z.enum(["all", "roles", "departments", "users"]),
  scheduledAt: z.string().optional(),
});

export type BroadcastFormValues = z.infer<typeof broadcastSchema>;
