import * as z from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import {
  EMERGENCY_RELATIONSHIPS,
  INDIA_COUNTRY_NAME,
  INDIAN_PINCODE_REGEX,
  PERSON_NAME_REGEX,
  STREET_ADDRESS_REGEX,
  isValidCityForState,
  isValidCountry,
  isValidIndianState,
} from "./address-options";

const MIN_AGE_YEARS = 14;
const MAX_AGE_YEARS = 100;

/**
 * The `as` is what keeps `emergencyRelation` a bare `string`. Zod 4 accepts a
 * readonly array, so dropping it types the field as the six literals — and that
 * narrowing surfaces a REAL defect three files away:
 * `features/employee-onboarding/components/step-personal.tsx` seeds
 * `emergencyRelation` from an unvalidated `string | undefined` and hands the
 * whole form to a `SubmitHandler` that no longer matches. That fix belongs to
 * whoever owns `features/**`; widening here is what hides it.
 */
const RELATIONSHIP_VALUES = EMERGENCY_RELATIONSHIPS.map((r) => r.value) as [
  string,
  ...string[],
];

export const dateOfBirthSchema = z
  .string()
  .min(1, "Date of birth is required")
  .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid date of birth")
  .refine((val) => new Date(val).getTime() <= Date.now(), "Date of birth cannot be in the future")
  .refine((val) => {
    const ageYears = (Date.now() - new Date(val).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return ageYears >= MIN_AGE_YEARS && ageYears <= MAX_AGE_YEARS;
  }, `Age must be between ${MIN_AGE_YEARS} and ${MAX_AGE_YEARS} years`);

const optionalStreet = z
  .string()
  .optional()
  .refine((val) => !val || STREET_ADDRESS_REGEX.test(val.trim()), {
    message: "Enter a valid street address (letters, numbers, and , . # / - only)",
  });

const optionalCountry = z
  .string()
  .optional()
  .refine((val) => !val || isValidCountry(val), { message: "Select a valid country" });

const optionalState = z
  .string()
  .optional()
  .refine((val) => !val || isValidIndianState(val), { message: "Select a valid state" });

const optionalCity = z
  .string()
  .optional()
  .refine((val) => !val || val.trim().length >= 2, { message: "Select a valid city" });

const optionalPostal = z
  .string()
  .optional()
  .refine((val) => !val || INDIAN_PINCODE_REGEX.test(val.trim()), {
    message: "Enter a valid 6-digit PIN code",
  });

export const personalInfoSchema = z
  .object({
    phone: z
      .string()
      .min(1, "Phone number is required")
      .refine((val) => isValidPhoneNumber(val), "Invalid phone number"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"], {
      error: "Please select a gender",
    }),
    dateOfBirth: dateOfBirthSchema,
    addressLine1: optionalStreet,
    addressCity: optionalCity,
    addressState: optionalState,
    addressPostalCode: optionalPostal,
    addressCountry: optionalCountry,
    emergencyName: z
      .string()
      .min(2, "Emergency contact name is required")
      .regex(PERSON_NAME_REGEX, "Enter a valid full name (letters only)"),
    emergencyRelation: z.enum(RELATIONSHIP_VALUES, {
      error: "Please select a relationship",
    }),
    emergencyPhone: z
      .string()
      .min(1, "Emergency contact phone is required")
      .refine((val) => isValidPhoneNumber(val), "Invalid phone number"),
  })
  .refine((val) => val.phone !== val.emergencyPhone, {
    message: "Emergency contact number must be different from your own phone number",
    path: ["emergencyPhone"],
  })
  .superRefine((val, ctx) => {
    const hasAddress =
      Boolean(val.addressLine1?.trim()) ||
      Boolean(val.addressCity?.trim()) ||
      Boolean(val.addressState?.trim()) ||
      Boolean(val.addressPostalCode?.trim()) ||
      Boolean(val.addressCountry?.trim());

    if (!hasAddress) return;

    if (!val.addressCountry?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Select a country",
        path: ["addressCountry"],
      });
      return;
    }

    if (val.addressCountry !== INDIA_COUNTRY_NAME) {
      ctx.addIssue({
        code: "custom",
        message: "Structured address is currently supported for India only",
        path: ["addressCountry"],
      });
      return;
    }

    if (!val.addressState?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Select a state",
        path: ["addressState"],
      });
    }
    if (!val.addressCity?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Select a city",
        path: ["addressCity"],
      });
    } else if (val.addressState && !isValidCityForState(val.addressState, val.addressCity)) {
      ctx.addIssue({
        code: "custom",
        message: "Select a city from the list for the chosen state",
        path: ["addressCity"],
      });
    }
    if (!val.addressPostalCode?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid PIN code",
        path: ["addressPostalCode"],
      });
    }
    if (!val.addressLine1?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Street address is required when adding a home address",
        path: ["addressLine1"],
      });
    }
  });

export type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;

export { MIN_AGE_YEARS, MAX_AGE_YEARS };
