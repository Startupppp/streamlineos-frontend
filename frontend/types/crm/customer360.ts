export const CONTACT_ROLE_DEFAULTS = [
  "decision_maker",
  "influencer",
  "champion",
  "blocker",
  "economic_buyer",
  "user",
] as const;

export type ContactRoleKey = (typeof CONTACT_ROLE_DEFAULTS)[number];

export interface ContactRole {
  id: string;
  orgId: string;
  contactId: number;
  entityType: "deal" | "company";
  entityId: number;
  roleKey: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactRoleCreateInput {
  entityType: "deal" | "company";
  entityId: number;
  roleKey: string;
  isPrimary?: boolean;
}

export interface MergeContactsInput {
  primaryId: number;
  duplicateId: number;
}

export interface MergeOrgsInput {
  primaryId: number;
  duplicateId: number;
}

export interface DuplicateContactPair {
  contact1: { id: number; name: string; email: string | null; phone: string | null };
  contact2: { id: number; name: string; email: string | null; phone: string | null };
  matchReason: "email" | "phone" | "name";
}

export interface DuplicateOrgPair {
  org1: { id: number; name: string; domain: string | null };
  org2: { id: number; name: string; domain: string | null };
  matchReason: "domain" | "name";
}

export interface Customer360SectionItem {
  id: number;
  [key: string]: unknown;
}

export interface Customer360Section {
  items: Customer360SectionItem[];
  total: number;
}

export interface Customer360Response {
  contacts?: Customer360Section;
  leads?: Customer360Section;
  deals?: Customer360Section;
  quotes?: Customer360Section;
  invoices?: Customer360Section;
  payments?: Customer360Section;
  supportTickets?: Customer360Section;
  surveys?: Customer360Section;
  activities?: Customer360Section;
  projects?: Customer360Section;
  signedDocuments?: Customer360Section;
}

export interface TimelineEvent {
  type: "contact_created" | "deal_created" | "lead_linked";
  entityId: number;
  label: string;
  meta: string | null;
  date: string;
}

export interface TimelinePage {
  items: TimelineEvent[];
  nextCursor: string | null;
}
