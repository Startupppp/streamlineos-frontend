import { z } from "zod";

export const intakeSettingsContract = z.object({
  projectId: z.number().int(),
  intakePublishedAt: z.iso.datetime({ offset: true }).nullable(),
  intakeToken: z.string().nullable(),
});

export type IntakeSettings = z.infer<typeof intakeSettingsContract>;
