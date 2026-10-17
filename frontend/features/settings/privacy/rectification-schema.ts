import { z } from "zod";
import type {
  RectifiableField,
  RectificationAddress,
  RectificationEmergencyContact,
  RectificationInput,
  StringRectifiableField,
} from "@/hooks/api/privacy/gdpr";

export const RECTIFIABLE_FIELDS: ReadonlyArray<{ value: RectifiableField; label: string }> = [
  { value: "profile.name", label: "Display name" },
  { value: "hr_profile.preferred_name", label: "Preferred name" },
  { value: "hr_profile.personal_email", label: "Personal email" },
  { value: "hr_profile.phone", label: "Phone" },
  { value: "hr_profile.date_of_birth", label: "Date of birth" },
  { value: "hr_profile.gender", label: "Gender" },
  { value: "hr_profile.address", label: "Home address" },
  { value: "hr_profile.emergency_contact", label: "Emergency contact" },
];

const FIELD_VALUES = [
  "profile.name",
  "hr_profile.preferred_name",
  "hr_profile.personal_email",
  "hr_profile.phone",
  "hr_profile.date_of_birth",
  "hr_profile.gender",
  "hr_profile.address",
  "hr_profile.emergency_contact",
] as const;

const MAX_LENGTH: Record<StringRectifiableField, number> = {
  "profile.name": 200,
  "hr_profile.preferred_name": 200,
  "hr_profile.personal_email": 254,
  "hr_profile.phone": 30,
  "hr_profile.date_of_birth": 10,
  "hr_profile.gender": 100,
};

const part = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`);
const isEmail = (value: string) => z.string().email().safeParse(value).success;

/** Mirrors `addressValueSchema`. */
const addressSchema = z.object({
  line1: part(200),
  line2: part(200),
  city: part(100),
  state: part(100),
  country: part(100),
  postalCode: part(20),
});

/** Mirrors `emergencyContactValueSchema`. */
const emergencyContactSchema = z.object({
  name: part(200),
  relationship: part(100),
  phone: part(30),
  email: part(254).refine((value) => value === "" || isEmail(value), "Enter a valid email address"),
});

export const EMPTY_ADDRESS = { line1: "", line2: "", city: "", state: "", country: "", postalCode: "" };
export const EMPTY_EMERGENCY_CONTACT = { name: "", relationship: "", phone: "", email: "" };

const hasAny = (parts: Record<string, string> | undefined) =>
  Object.values(parts ?? {}).some((value) => value.trim() !== "");

/** Mirrors the per-field limits of the backend's `gdprRectificationBodySchema`. */
export const rectificationSchema = z
  .object({
    field: z.enum(FIELD_VALUES),
    value: z.string().trim(),
    address: addressSchema.optional(),
    emergencyContact: emergencyContactSchema.optional(),
  })
  .superRefine((values, ctx) => {
    const issue = (path: string[], message: string) => ctx.addIssue({ code: "custom", path, message });
    if (values.field === "hr_profile.address") {
      if (!hasAny(values.address)) issue(["address", "line1"], "Enter the corrected address");
      return;
    }
    if (values.field === "hr_profile.emergency_contact") {
      if (!hasAny(values.emergencyContact)) issue(["emergencyContact", "name"], "Enter the corrected contact");
      return;
    }
    if (values.value.length === 0) issue(["value"], "Enter the corrected value");
    else if (values.value.length > MAX_LENGTH[values.field]) issue(["value"], `Keep it under ${MAX_LENGTH[values.field]} characters`);
    else if (values.field === "hr_profile.personal_email" && !isEmail(values.value))
      issue(["value"], "Enter a valid email address");
    else if (values.field === "hr_profile.date_of_birth" && !/^\d{4}-\d{2}-\d{2}$/.test(values.value))
      issue(["value"], "Use the format YYYY-MM-DD");
  });

export type RectificationFormInput = z.input<typeof rectificationSchema>;
export type RectificationValues = z.output<typeof rectificationSchema>;

/** Only the parts the subject filled in; the backend rejects an empty email and stores what it is sent. */
function filled<T extends Record<string, string>>(parts: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key in parts) if (parts[key] !== "") out[key] = parts[key];
  return out;
}

/** The wire body for `POST /gdpr/rectification/me`. */
export function toRectificationBody(values: RectificationValues): RectificationInput {
  if (values.field === "hr_profile.address")
    return { field: values.field, value: filled(values.address ?? EMPTY_ADDRESS) satisfies RectificationAddress };
  if (values.field === "hr_profile.emergency_contact")
    return {
      field: values.field,
      value: filled(values.emergencyContact ?? EMPTY_EMERGENCY_CONTACT) satisfies RectificationEmergencyContact,
    };
  return { field: values.field, value: values.value };
}
