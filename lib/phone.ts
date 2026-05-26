import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import type { Country } from "react-phone-number-input";

/** Phone string for form state and API payloads (E.164 when entered via PhoneInput). */
export type PhoneValue = string;

export const DEFAULT_PHONE_COUNTRY: Country = "IN";

/** Example national format shown in empty phone fields (India 10-digit, 5+5). */
export const PHONE_INPUT_PLACEHOLDER = "86884 41350";

export function isOptionalPhoneValid(value: string | undefined | null): boolean {
  if (!value || value.trim() === "") return true;
  return isValidPhoneNumber(value);
}

export const optionalPhoneSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => isOptionalPhoneValid(val), { message: "Invalid phone number" });

export const requiredPhoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine((val) => isValidPhoneNumber(val), "Invalid phone number");
