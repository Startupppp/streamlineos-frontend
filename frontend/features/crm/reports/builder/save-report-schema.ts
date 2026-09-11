import { z } from "zod";

/**
 * Naming a report, bounded the way `createDefinitionSchema` bounds it.
 *
 * The name is unique per tenant on the server — `uniq_crm_report_definitions_org_name`
 * — because two reports called "Q3 pipeline" that return different numbers is
 * how a disagreement in a meeting becomes unresolvable. That collision comes
 * back as a 409 and is reported where it happens, not guessed at here.
 */
export const saveReportSchema = z.object({
  name: z.string().trim().min(1, "Give the report a name").max(200, "At most 200 characters"),
  description: z.string().trim().max(2000, "At most 2000 characters"),
});

export type SaveReportValues = z.infer<typeof saveReportSchema>;

export const EMPTY_SAVE_REPORT_VALUES: SaveReportValues = { name: "", description: "" };
