import type { z } from "zod";
import type { customerPageContract } from "@/hooks/api/build/reports-schema";
import type {
  contactDetailContract,
  contactListContract,
  contactRecordContract,
  contactRowContract,
} from "@/hooks/api/crm/contacts-schema";
export type OrgSize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";
export type OrgTimelineEventType = "contact_created" | "deal_created" | "lead_linked" | "note_added";

export interface CrmOrganization {
  id: number;
  orgId: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: OrgSize | null;
  website: string | null;
  linkedinUrl: string | null;
  description: string | null;
  healthScore: number | null;
  parentId: number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contacts?: Contact[];
  openRequestCount?: number;
}

export type Contact = z.infer<typeof contactRowContract>;

export type ContactDetail = z.infer<typeof contactDetailContract>;

export type ContactRecord = z.infer<typeof contactRecordContract>;

export interface ContactFilters {
  search?: string;
  organizationId?: number;
  limit?: number;
  cursor?: string;
}

export type PaginatedContacts = z.infer<typeof contactListContract>;

export interface CreateContactInput {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  company?: string;
  organizationId?: number;
  linkedinUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  notes?: string | null;
  leadId?: number;
  dealId?: number;
  tags?: string[];
}

export interface UpdateContactInput {
  id: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  department?: string | null;
  company?: string | null;
  organizationId?: number | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  websiteUrl?: string | null;
  avatarUrl?: string | null;
  tags?: string[];
  notes?: string | null;
}

export interface OrgHierarchyNode {
  id: number;
  name: string;
  industry: string | null;
  healthScore: number | null;
  parentId: number | null;
  children: OrgHierarchyNode[];
}

export interface OrgRollup {
  totalContacts: number;
  totalDeals: number;
  openDeals: number;
  totalDealValue: number;
  totalLeads: number;
}

export interface OrgTimelineEvent {
  id: string;
  date: string;
  type: OrgTimelineEventType;
  description: string;
  entityId: number;
}

export interface PaginatedCrmOrganizations {
  organizations: CrmOrganization[];
  hasMore: boolean;
  nextCursor: string | null;
  totalCount?: number;
}

export type BuildCustomersPage = z.infer<typeof customerPageContract>;



export interface CrmOrganizationFilters {
  search?: string;
  q?: string;
  cursor?: string;
  pageSize?: number;
}

export interface CreateCrmOrganizationInput {
  name: string;
  domain?: string;
  industry?: string;
  size?: OrgSize;
  website?: string;
  linkedinUrl?: string;
  description?: string;
}

/**
 * Mirrors `organizationUpdateSchema` exactly, nullables included: the PATCH
 * endpoint reads `null` as "clear this column" and omission as "leave it alone".
 * Typed as `Partial<CreateCrmOrganizationInput>` the two were indistinguishable,
 * so no field could be emptied once set.
 */
export interface UpdateCrmOrganizationInput {
  name?: string;
  domain?: string | null;
  industry?: string | null;
  size?: OrgSize | null;
  website?: string | null;
  linkedinUrl?: string | null;
  description?: string | null;
  healthScore?: number | null;
  parentId?: number | null;
  notes?: string | null;
}

import type { StatWithTrend } from "./deals";

export interface SupportDashboardStats {
  openTickets: StatWithTrend;
  avgResolution: StatWithTrend<string>;
  csatScore: StatWithTrend<string>;
  responseRate: StatWithTrend<string>;
}

export interface TicketBreakdownItem {
  label: string;
  value: number;
  color: string;
}

export interface SupportActivityItem {
  type: "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation";
  message: string;
  time: string;
  person: string;
}

export interface SupportTeamMember {
  name: string;
  role: string;
  access: string;
  avatar: string;
  status: "online" | "away" | "offline";
}

export interface SupportDashboard {
  supportDashboardStats: SupportDashboardStats;
  ticketStatusBreakdown: TicketBreakdownItem[];
  ticketVolumeTimeline: { month: string; value: number }[];
  supportActivityFeed: SupportActivityItem[];
  supportTeamMembers: SupportTeamMember[];
  ticketsByPriority: TicketBreakdownItem[];
}
