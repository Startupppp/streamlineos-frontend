import { z } from "zod";

const splitValues = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const SECURITY_LIST_MAX_ENTRIES = 100;
const DOMAIN_MAX_LENGTH = 253;
const IP_ENTRY_MAX_LENGTH = 128;

export const orgSecurityFormSchema = z.object({
  mfaEnforced: z.boolean(),
  allowedEmailDomains: z
    .string()
    .max(2000)
    .refine(
      (value) => splitValues(value).every((domain) => z.string().email().safeParse(`admin@${domain}`).success),
      "Enter valid email domains",
    )
    .refine(
      (value) => splitValues(value).every((domain) => domain.length <= DOMAIN_MAX_LENGTH),
      `Each domain must be ${DOMAIN_MAX_LENGTH} characters or fewer`,
    )
    .refine(
      (value) => new Set(splitValues(value)).size <= SECURITY_LIST_MAX_ENTRIES,
      `Enter at most ${SECURITY_LIST_MAX_ENTRIES} domains`,
    ),
  ipAllowlist: z
    .string()
    .max(5000)
    .refine(
      (value) => splitValues(value).every((entry) => entry.length <= IP_ENTRY_MAX_LENGTH),
      `Each entry must be ${IP_ENTRY_MAX_LENGTH} characters or fewer`,
    )
    .refine(
      (value) => new Set(splitValues(value)).size <= SECURITY_LIST_MAX_ENTRIES,
      `Enter at most ${SECURITY_LIST_MAX_ENTRIES} IP entries`,
    ),
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
