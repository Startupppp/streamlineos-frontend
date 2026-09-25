import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { IMPLAUSIBLE_PHONE_MESSAGE, isImplausiblePhone } from "@/lib/implausible-phone";

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
/** Mirrors `setupSchema.fullName` (`organization/setup/dto/org.schemas.ts`). */
export const FULL_NAME_MAX_LENGTH = 120;
export const INDUSTRY_MAX_LENGTH = 100;

export const basicsStepSchema = z.object({
  // HRMS-E2E-025. The owner showed up throughout the product as the local part
  // of their sign-up address, because nothing ever asked for their name — this
  // step took the company's name, industry, size and phone, never the person's.
  fullName: z
    .string()
    .trim()
    .min(1, "Enter your full name.")
    .max(
      FULL_NAME_MAX_LENGTH,
      `Your name must be ${FULL_NAME_MAX_LENGTH} characters or fewer.`,
    ),
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
    .refine((val) => isValidPhoneNumber(val), "Enter a valid mobile number.")
    // isValidPhoneNumber checks the numbering plan, and 9999999999 satisfies it
    // — ten digits, leading 9, right length for +91. QA typed exactly that and
    // was let through. No OTP is sent here, so nothing downstream would ever
    // have found out that the contact cannot be reached.
    .refine((val) => !isImplausiblePhone(val), IMPLAUSIBLE_PHONE_MESSAGE),
});
