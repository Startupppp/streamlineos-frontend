import { z } from "zod";

export const rosterEntrySchema = z.object({
  userId: z.string().min(1, "Choose who is working"),
  date: z.string().min(1, "Choose a date"),
  shiftId: z.string(),
  isDayOff: z.boolean(),
  notes: z.string().max(500).optional(),
});

export type RosterEntryFormValues = z.infer<typeof rosterEntrySchema>;

export const emptyRosterEntry: RosterEntryFormValues = {
  userId: "",
  date: "",
  shiftId: "",
  isDayOff: false,
  notes: "",
};

export function rosterEntryPayload(
  values: RosterEntryFormValues,
): { userId: string; date: string; shiftId?: number; isDayOff?: boolean; notes?: string } {
  const shiftId = Number.parseInt(values.shiftId, 10);
  const notes = values.notes?.trim();
  return {
    userId: values.userId,
    date: values.date,
    ...(values.isDayOff ? { isDayOff: true } : {}),
    ...(!values.isDayOff && Number.isFinite(shiftId) ? { shiftId } : {}),
    ...(notes ? { notes } : {}),
  };
}
