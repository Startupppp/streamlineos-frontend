import { z } from "zod";

export const SIGNUP_COUNTRIES = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "SG", label: "Singapore" },
] as const;

export const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().max(100).optional(),
    companyName: z.string().min(1, "Organization name is required").max(200),
    email: z.string().email("Enter a valid work email").max(254),
    phone: z.string().max(32).optional(),
    country: z.enum(SIGNUP_COUNTRIES.map((country) => country.value)),
  })
  .strict();

export type SignupFormValues = z.infer<typeof signupSchema>;
