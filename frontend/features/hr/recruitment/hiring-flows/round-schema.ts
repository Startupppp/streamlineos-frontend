import { z } from "zod";

export const ROUND_TYPES = [
  { value: "HR_SCREENING", label: "HR Screening" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "MANAGER", label: "Manager" },
  { value: "CULTURAL_FIT", label: "Cultural Fit" },
  { value: "FINAL", label: "Final" },
  { value: "CUSTOM", label: "Custom" },
] as const;

export const ROUND_MODES = [
  { value: "VIDEO", label: "Video" },
  { value: "PHONE", label: "Phone" },
  { value: "ONSITE", label: "On-site" },
] as const;

export const roundSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  roundType: z.enum(["HR_SCREENING", "TECHNICAL", "MANAGER", "CULTURAL_FIT", "FINAL", "CUSTOM"]),
  mode: z.enum(["VIDEO", "PHONE", "ONSITE"]),
  durationMinutes: z.string().refine(
    (v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 15 && n <= 480;
    },
    { message: "Duration must be between 15 and 480 minutes" },
  ),
  slaDays: z.string().refine(
    (v) => v === "" || (!isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 1 && parseInt(v, 10) <= 30),
    { message: "SLA days must be between 1 and 30" },
  ).optional(),
});

export type RoundFormValues = z.infer<typeof roundSchema>;
