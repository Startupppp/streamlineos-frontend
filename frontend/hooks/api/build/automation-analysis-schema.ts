import type {
  ProjectsAutomationsDryRunResponse,
  ProjectsAutomationsListRunsResponse,
} from "@/contracts/build-contracts.generated";
import { z } from "zod";

export const dryRunTicketInputSchema = z.object({
  ticketId: z.number().int().positive().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
});

export type DryRunTicketInput = z.infer<typeof dryRunTicketInputSchema>;
export type AutomationDryRunItem = ProjectsAutomationsDryRunResponse["items"][number];
export type AutomationRunRow = ProjectsAutomationsListRunsResponse["items"][number];
