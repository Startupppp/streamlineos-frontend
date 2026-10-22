import { z } from "zod";
import type { RectifiableField } from "@/hooks/api/privacy/gdpr";

export const RECTIFIABLE_FIELDS: ReadonlyArray<{ value: RectifiableField; label: string }> = [
  { value: "profile.name", label: "Display name" },
  { value: "hr_profile.preferred_name", label: "Preferred name" },
  { value: "hr_profile.personal_email", label: "Personal email" },
  { value: "hr_profile.phone", label: "Phone" },
  { value: "hr_profile.date_of_birth", label: "Date of birth" },
  { value: "hr_profile.gender", label: "Gender" },
];

const FIELD_VALUES = ["profile.name", "hr_profile.preferred_name", "hr_profile.personal_email", "hr_profile.phone", "hr_profile.date_of_birth", "hr_profile.gender"] as const;

const MAX_LENGTH: Record<RectifiableField, number> = {
  "profile.name": 200,
  "hr_profile.preferred_name": 200,
  "hr_profile.personal_email": 254,
  "hr_profile.phone": 30,
  "hr_profile.date_of_birth": 10,
  "hr_profile.gender": 100,
};

export const rectificationSchema = z
  .object({ field: z.enum(FIELD_VALUES), value: z.string().trim().min(1, "Enter the corrected value") })
  .superRefine((values, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", path: ["value"], message });
    if (values.value.length > MAX_LENGTH[values.field]) issue(`Keep it under ${MAX_LENGTH[values.field]} characters`);
    else if (values.field === "hr_profile.personal_email" && !z.string().email().safeParse(values.value).success)
      issue("Enter a valid email address");
    else if (values.field === "hr_profile.date_of_birth" && !/^\d{4}-\d{2}-\d{2}$/.test(values.value))
      issue("Use the format YYYY-MM-DD");
  });

export type RectificationValues = z.output<typeof rectificationSchema>;
