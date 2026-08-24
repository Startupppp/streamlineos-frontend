import type { FieldKind, SelectOption } from "@/lib/renderer/layout";

/**
 * A tenant's declaration of a field on a subject type.
 *
 * Deliberately the renderer's `FieldSpec` minus the properties only a compiled
 * layout can set, so a declaration becomes a rendered surface with no
 * translation layer in between.
 */
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

/** A party as it appears on a subject: the other end of one link. */
export interface SubjectPartyLink {
  partyId: string;
  name: string;
  relationship: string;
  subjectPartyLinkId: string;
}

/** A subject as it appears on a party: the same link read the other way. */
export interface PartySubjectLink {
  subjectId: string;
  title: string;
  status: string | null;
  subjectTypeId: string;
  typeKey: string;
  relationship: string;
  subjectPartyLinkId: string;
}

export interface SubjectWithParties extends Subject {
  parties: SubjectPartyLink[];
}

/** Cursor-paginated, matching the platform's keyset page envelope. */
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
