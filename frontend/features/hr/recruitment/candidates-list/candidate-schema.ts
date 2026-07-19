import { z } from "zod";

export const candidateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(80, "First name must be at most 80 characters")
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "First name must contain a letter or number"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(80, "Last name must be at most 80 characters")
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "Last name must contain a letter or number"),
  email: z.string().trim().email("Invalid email").max(254, "Email must be at most 254 characters"),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val) return true;
      const digits = val.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Enter a valid phone number (7–15 digits)"),
  source: z.string(),
  currentRole: z.string().max(120).optional().or(z.literal("")),
  currentCompany: z.string().max(120).optional().or(z.literal("")),
  experienceYears: z.number().min(0, "Cannot be negative").max(50, "Cannot exceed 50 years").optional(),
  skills: z.string().max(500).optional().or(z.literal("")),
  linkedinUrl: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("www."),
      "Enter a valid URL",
    ),
  notes: z.string().max(2000).optional().or(z.literal("")),
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
