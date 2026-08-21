import { z } from "zod";
import {
  WAITLIST_TEAM_SIZES,
  type WaitlistJoinPayload,
} from "@/lib/api/hooks/waitlist";

export const waitlistFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  email: z
    .string()
    .trim()
    .min(1, "Work email is required")
    .email("Enter a valid email address")
    .max(320, "Email must be 320 characters or fewer"),
  company: z
    .string()
    .trim()
    .max(200, "Company must be 200 characters or fewer"),
  teamSize: z.union([z.literal(""), z.enum(WAITLIST_TEAM_SIZES)]),
});

export type WaitlistFormValues = z.infer<typeof waitlistFormSchema>;

export const WAITLIST_DEFAULT_VALUES: WaitlistFormValues = {
  name: "",
  email: "",
  company: "",
  teamSize: "",
};

export function toWaitlistPayload(
  values: WaitlistFormValues,
): WaitlistJoinPayload {
  const company = values.company.trim();
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    ...(company ? { company } : {}),
    ...(values.teamSize ? { teamSize: values.teamSize } : {}),
    source: "landing",
  };
}
