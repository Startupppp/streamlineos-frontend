import { z } from "zod";

const globalSearchResultSchema = z.object({
  id: z.union([z.number().int(), z.string()]),
  type: z.enum([
    "lead",
    "deal",
    "contact",
    "client",
    "ticket",
    "employee",
    "doc_page",
    "calendar_event",
    "support_ticket",
  ]),
  title: z.string(),
  subtitle: z.string(),
  href: z.string(),
  status: z.string().optional(),
});

export const globalSearchContract = z.object({
  results: z.array(globalSearchResultSchema),
  total: z.number().int(),
});
