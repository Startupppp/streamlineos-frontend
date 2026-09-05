import { z } from "zod";

export const briefCitationSchema = z.object({
  id: z.string(),
  title: z.string(),
  href: z.string().regex(/^\/(?![/\\])[^\\\s\u0000-\u001f\u007f]*$/),
});

export const briefCitationsSchema = z.array(briefCitationSchema);

export type BriefCitation = z.infer<typeof briefCitationSchema>;
