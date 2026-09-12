import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

/**
 * Mirrors the backend's `setupSchema`
 * (`organization/setup/dto/org.schemas.ts`) and `generateSchema`
 * (`organization/onboarding/dto/workspace-onboarding.schemas.ts`).
 *
 * Without these caps an over-long company name or a hand-typed industry passes
 * Basics unchallenged and only fails at Launch, as a server error two steps
 * away from the field that caused it. A draft restored from local storage or
 * the server can also carry an over-long value written before the cap existed,
 * so the schema has to catch it even where the input's `maxLength` would.
 */
export const COMPANY_NAME_MAX_LENGTH = 200;
export const INDUSTRY_MAX_LENGTH = 100;

export const basicsStepSchema = z.object({
  goals: z.array(z.string()).min(1, "Select at least one goal."),
  industry: z
    .string()
    .trim()
    .min(1, "Select or enter your industry.")
    .max(
      INDUSTRY_MAX_LENGTH,
      `Industry must be ${INDUSTRY_MAX_LENGTH} characters or fewer.`,
    ),
  companyName: z
    .string()
    .trim()
    .min(1, "Enter your company name.")
    .max(
      COMPANY_NAME_MAX_LENGTH,
      `Company name must be ${COMPANY_NAME_MAX_LENGTH} characters or fewer.`,
    ),
  teamSize: z.string().min(1, "Select your team size."),
  phone: z
    .string()
    .min(1, "Enter your mobile number.")
    .refine((val) => isValidPhoneNumber(val), "Enter a valid mobile number."),
});
