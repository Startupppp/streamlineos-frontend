import type { CommitmentReference } from "@/hooks/api/calendar-commitment-schema";
import type { CreateCalendarSourceActionProposalInput } from "@/hooks/api/calendar-source-actions";

export interface CalendarScenarioDraftStep {
  root: CommitmentReference;
  step: CreateCalendarSourceActionProposalInput["steps"][number];
  label: string;
}
