import { z } from "zod";

const SYMBOL_ONLY_RE = /^[^a-zA-Z0-9]+$/;

export const meetingSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title must be 200 characters or fewer")
      .transform((v) => v.trim())
      .refine((v) => v.length > 0, "Title cannot be blank or whitespace only")
      .refine((v) => !SYMBOL_ONLY_RE.test(v), "Title must contain at least one letter or number"),
    type: z.enum(["meeting", "standup", "retro", "planning", "review"] as const),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled"] as const),
    agenda: z.string(),
    scheduledAt: z.string(),
    endAt: z.string(),
    durationMinutes: z.string(),
    timezone: z.string(),
    recurrenceEnabled: z.boolean(),
    recurrenceFrequency: z.enum(["daily", "weekly", "biweekly", "custom"] as const),
    recurrenceEndDate: z.string(),
  })
  .refine(
    (data) => {
      if (data.scheduledAt && data.endAt) {
        return new Date(data.endAt) > new Date(data.scheduledAt);
      }
      return true;
    },
    { message: "End time must be after start time", path: ["endAt"] },
  )
  .refine(
    (data) => {
      if (data.scheduledAt) {
        return new Date(data.scheduledAt) >= new Date(Date.now() - 60_000);
      }
      return true;
    },
    { message: "Meeting cannot be scheduled in the past", path: ["scheduledAt"] },
  );

export type MeetingFormValues = z.infer<typeof meetingSchema>;

export function getDefaultStart(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function getDefaultEnd(startStr: string, durationMin: number): string {
  if (!startStr) return "";
  const d = new Date(startStr);
  d.setMinutes(d.getMinutes() + durationMin);
  return d.toISOString().slice(0, 16);
}

export const CREATE_DEFAULTS: MeetingFormValues = {
  title: "",
  type: "meeting",
  status: "scheduled",
  agenda: "",
  scheduledAt: "",
  endAt: "",
  durationMinutes: "30",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  recurrenceEnabled: false,
  recurrenceFrequency: "weekly",
  recurrenceEndDate: "",
};

export function meetingToFormValues(m: {
  title: string;
  type: MeetingFormValues["type"];
  status: MeetingFormValues["status"];
  agenda?: string | null;
  scheduledAt?: string | null;
  endAt?: string | null;
  durationMinutes?: number | null;
  timezone?: string | null;
  recurrenceRule?: { frequency: MeetingFormValues["recurrenceFrequency"]; endDate?: string | null } | null;
}): MeetingFormValues {
  return {
    title: m.title,
    type: m.type,
    status: m.status,
    agenda: m.agenda ?? "",
    scheduledAt: m.scheduledAt ? m.scheduledAt.slice(0, 16) : "",
    endAt: m.endAt ? m.endAt.slice(0, 16) : "",
    durationMinutes: m.durationMinutes != null ? String(m.durationMinutes) : "",
    timezone: m.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    recurrenceEnabled: !!m.recurrenceRule,
    recurrenceFrequency: m.recurrenceRule?.frequency ?? "weekly",
    recurrenceEndDate: m.recurrenceRule?.endDate ?? "",
  };
}
