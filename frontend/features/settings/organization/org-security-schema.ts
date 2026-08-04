import { z } from "zod";

const splitValues = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const orgSecurityFormSchema = z.object({
  mfaEnforced: z.boolean(),
  allowedEmailDomains: z
    .string()
    .max(2000)
    .refine(
      (value) => splitValues(value).every((domain) => z.string().email().safeParse(`admin@${domain}`).success),
      "Enter valid email domains",
    ),
  ipAllowlist: z.string().max(5000),
  maxConcurrentSessions: z
    .string()
    .refine(
      (value) =>
        value.trim() === "" ||
        (/^\d+$/.test(value.trim()) &&
          Number(value) >= 1 &&
          Number(value) <= 100),
      "Enter a number from 1 to 100",
    ),
});

export type OrgSecurityFormValues = z.infer<typeof orgSecurityFormSchema>;

export function parseSecurityList(value: string): string[] {
  return [...new Set(splitValues(value))];
}
