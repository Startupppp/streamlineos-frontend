import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { isImplausiblePhone } from "@/lib/implausible-phone";
import { COUNTRY_OPTIONS, timezonesForCountry } from "@/lib/location/org-locale-options";
import type { WizardData } from "./wizard-data-schema";

export const DISPLAY_NAME_MAX_LENGTH = 100;
const COUNTRY_CODES = new Set<string>(COUNTRY_OPTIONS.map(({ value }) => value));

export const workspaceStepSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter a workspace name.")
    .max(
      DISPLAY_NAME_MAX_LENGTH,
      `Workspace name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    ),
  phone: z
    .string()
    .trim()
    .min(1, "Enter a contact phone number.")
    .max(30, "Phone number must be 30 characters or fewer.")
    .refine(isValidPhoneNumber, "Enter a valid phone number with country code.")
    .refine((value) => !isImplausiblePhone(value), "Enter a real contact phone number."),
  country: z
    .string()
    .trim()
    .min(1, "Select a country.")
    .refine((value) => !value || COUNTRY_CODES.has(value), "Select a valid country."),
  timezone: z.string().trim().min(1, "Select a time zone."),
}).superRefine(({ country, timezone }, ctx) => {
  if (COUNTRY_CODES.has(country) && timezone && !timezonesForCountry(country).includes(timezone)) {
    ctx.addIssue({
      code: "custom",
      path: ["timezone"],
      message: "Select a time zone for this country.",
    });
  }
});

export function parseWorkspaceStep(data: WizardData) {
  return workspaceStepSchema.safeParse({
    displayName: data.displayName,
    phone: data.phone,
    country: data.country ?? "",
    timezone: data.timezone ?? "",
  });
}

export const WORKSPACE_VISIBLE_FIELDS = ["displayName", "phone", "country", "timezone"] as const;
