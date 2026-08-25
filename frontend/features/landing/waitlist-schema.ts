import { z } from "zod";

export const TEAM_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

export const waitlistSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .min(1, "Work email is required")
    .email("Enter a valid email address"),
  organization: z.string().trim().min(1, "Organization is required"),
  role: z.string().trim(),
  teamSize: z.enum(TEAM_SIZES),
  notes: z.string().trim(),
});

export type WaitlistFormValues = z.infer<typeof waitlistSchema>;

export type WaitlistFieldErrors = Partial<Record<keyof WaitlistFormValues, string>>;

export type WaitlistEntry = {
  reference: string;
  position: number;
  alreadyJoined: boolean;
};

export type WaitlistResult =
  | { ok: true; entry: WaitlistEntry }
  | { ok: false; error: string; fieldErrors?: WaitlistFieldErrors };
