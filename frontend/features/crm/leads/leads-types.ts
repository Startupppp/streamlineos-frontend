/** The board's columns, in pipeline order. `LeadStatus` is derived from it so
 * the two cannot drift. */
export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface TeamMember {
  id: string;
  name: string | null;
  image?: string | null;
}

export interface BoardLead {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  priority?: string | null;
  potentialValue?: string | null;
  score?: number | null;
  slaDeadline?: string | Date | null;
  createdAt?: string | Date | null;
  assignedTo?: { name?: string | null; image?: string | null } | null;
}

export interface LeadActivity {
  id: number;
  type: string;
  date: string | Date;
  subject?: string | null;
  notes?: string | null;
  outcome?: string | null;
  user?: { name?: string | null } | null;
}
