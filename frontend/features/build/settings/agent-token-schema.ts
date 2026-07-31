import { z } from "zod";

export const EXPIRY_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "never", label: "Never" },
] as const;

export type ExpiryValue = (typeof EXPIRY_OPTIONS)[number]["value"];

export const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export type CreateFormValues = z.infer<typeof createSchema>;
