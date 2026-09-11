import { z } from "zod";

export const complianceCalendarContract = z.object({
  events: z.array(
    z.object({
      date: z.string(),
      type: z.enum(["document_expiry", "certification_expiry"]),
      title: z.string(),
      entityId: z.number().int(),
      entityName: z.string(),
    }),
  ),
  year: z.number().int(),
  month: z.number().int(),
});
