import { z } from "zod";

/** Matches backend createCandidateSchema phone rule after optional + and digits only. */
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export function normalizeCandidatePhone(value: string | undefined | null): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return undefined;
  const normalized = hasPlus ? `+${digits}` : digits;
  return PHONE_REGEX.test(normalized) ? normalized : normalized;
}

export function isValidCandidatePhone(value: string | undefined | null): boolean {
  if (!value?.trim()) return true;
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return true;
  const normalized = hasPlus ? `+${digits}` : digits;
  return PHONE_REGEX.test(normalized);
}

export const candidateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must be at most 50 characters")
    .refine((v) => /[a-zA-Z]/.test(v), "First name must contain at least one letter"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must be at most 50 characters")
    .refine((v) => /[a-zA-Z]/.test(v), "Last name must contain at least one letter"),
  email: z.string().trim().email("Valid email is required").max(254, "Email must be at most 254 characters"),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidCandidatePhone(val), "Phone must be 8–15 digits, optionally starting with +"),
  source: z.string(),
  currentRole: z.string().max(200).optional().or(z.literal("")),
  currentCompany: z.string().max(200).optional().or(z.literal("")),
  experienceYears: z.number().min(0, "Cannot be negative").max(50, "Cannot exceed 50 years").optional(),
  skills: z.string().max(1000).optional().or(z.literal("")),
  linkedinUrl: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => {
        if (!v) return true;
        try {
          const url = v.startsWith("www.") ? `https://${v}` : v;
          const parsed = new URL(url);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      "Enter a valid URL (https://…)",
    ),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export type CandidateFormValues = z.infer<typeof candidateSchema>;

export const DEFAULT_CANDIDATE_VALUES: CandidateFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  source: "DIRECT",
  currentRole: "",
  currentCompany: "",
  experienceYears: undefined,
  skills: "",
  linkedinUrl: "",
  notes: "",
};
