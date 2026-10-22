import type { FieldKind, SelectOption } from "@/lib/renderer/layout";

export interface SubjectFieldDefinition {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: SelectOption[];
  hint?: string;
}

export interface SubjectType {
  subjectTypeId: string;
  organizationId: string;
  key: string;
  singular: string;
  plural: string;
  titleField: string;
  fields: SubjectFieldDefinition[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  subjectId: string;
  organizationId: string;
  subjectTypeId: string;
  title: string;
  reference: string | null;
  status: string | null;
  customFields: Record<string, unknown> | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectPartyLink {
  partyId: string;
  name: string;
  relationship: string;
  subjectPartyLinkId: string;
}

export interface PartySubjectLink {
  subjectId: string;
  title: string;
  status: string | null;
  subjectTypeId: string;
  typeKey: string;
  relationship: string;
  subjectPartyLinkId: string;
}

export interface SubjectWithParties {
  subjectId: string;
  organizationId: string;
  subjectTypeId: string;
  typeKey: string;
  typeSingular: string;
  title: string;
  reference: string | null;
  status: string | null;
  fields: SubjectFieldDefinition[];
  customFields: Record<string, unknown> | null;
  createdAt: string;
  linkedPartyId: string | null;
  resolvedVia: "subject-record" | "link-record";
  parties: SubjectPartyLink[];
}

export interface SubjectsPage {
  data: Subject[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface CreateSubjectTypeInput {
  key: string;
  singular: string;
  plural: string;
  titleField: string;
  fields: SubjectFieldDefinition[];
}

export interface CreateSubjectInput {
  subjectTypeId: string;
  reference?: string;
  status?: string;
  values: Record<string, unknown>;
}

export interface UpdateSubjectInput {
  reference?: string | null;
  status?: string | null;
  values?: Record<string, unknown>;
}

export interface LinkPartyInput {
  partyId: string;
  relationship: string;
}
