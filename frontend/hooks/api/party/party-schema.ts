import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Contracts for `PartyController` and `SubjectController` handlers.
 *
 * Party list uses offset-based pagination (`{ data, pagination: { page, limit,
 * total, totalPages, nextCursor, hasMore } }`), not cursor-only.
 * Subject list uses cursor-based pagination (`{ data, pagination }`) from
 * `cursorPageSchema`.
 *
 * NOT `.strict()`. Timestamps are ISO strings.
 */

export const partyRowContract = z.object({
  partyId: z.string(),
  organizationId: z.string(),
  partyType: z.string(),
  partyKind: z.string().nullable(),
  name: z.string(),
  legalName: z.string().nullable(),
  displayName: z.string().nullable(),
  taxNumber: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  notes: z.string().nullable(),
  employerPartyId: z.string().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * `PartyService.listParties` answers in two shapes. Given a `cursor` it returns
 * the keyset page only — `{ page, limit, hasMore, nextCursor }`. Given none, it
 * also counts, and adds `total` + `totalPages`. `useParties` never sends a
 * cursor, so `total` and `totalPages` are declared required here: they are
 * present on every response this contract is applied to, and the parties table
 * renders its footer from them.
 */
const partyPaginationContract = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const partyListContract = z.object({
  data: z.array(partyRowContract),
  pagination: partyPaginationContract,
});

export const partyDetailContract = partyRowContract;

export const partyMutationContract = partyRowContract;

/**
 * `kind` and `tone` are narrowed to the backend's own closed sets — `FIELD_KINDS`
 * and `TONES` in `party/dto/subject.schemas.ts`, which every write to this JSONB
 * column passes through under `.strict()`. They are NOT the frontend's wider
 * `FieldKind`, which carries members this API cannot store.
 */
const subjectTypeFieldContract = z.object({
  name: z.string(),
  label: z.string(),
  kind: z.enum([
    "text", "email", "phone", "url", "number",
    "money", "date", "select", "badge", "longText",
  ]),
  required: z.boolean().optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    tone: z.enum(["success", "warning", "danger", "info", "neutral"]).optional(),
  })).optional(),
  hint: z.string().optional(),
});

const subjectTypeRowContract = z.object({
  subjectTypeId: z.string(),
  organizationId: z.string(),
  key: z.string(),
  singular: z.string(),
  plural: z.string(),
  titleField: z.string(),
  fields: z.array(subjectTypeFieldContract),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const subjectTypeListContract = z.object({ data: z.array(subjectTypeRowContract) });
export const subjectTypeDetailContract = subjectTypeRowContract;
export const subjectTypeMutationContract = subjectTypeRowContract;
export const subjectTypeDeleteContract = z.object({ deleted: z.literal(true) });

const subjectItemContract = z.object({
  subjectId: z.string(),
  organizationId: z.string(),
  subjectTypeId: z.string(),
  title: z.string(),
  reference: z.string().nullable(),
  status: z.string().nullable(),
  customFields: z.record(z.string(), z.unknown()).nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * The row `subject_party_links` actually stores — `linkedAt`/`linkedBy`, never
 * `createdAt`/`createdBy`. The module's `@ResponseSchema` names the latter pair,
 * which is why openapi does too; neither column exists on the table.
 */
const subjectPartyLinkRowContract = z.object({
  subjectPartyLinkId: z.string(),
  subjectId: z.string(),
  partyId: z.string(),
  organizationId: z.string(),
  relationship: z.string(),
  linkedAt: z.string(),
  linkedBy: z.string().nullable(),
});

export const subjectListContract = cursorPageContract(subjectItemContract);

/**
 * `SubjectService.getSubject` resolves through the subject seam, so the single
 * read is a PROJECTION and not the row: it carries the type's declaration
 * (`typeKey`, `typeSingular`, `fields`) and drops `updatedAt`/`deletedAt`. Its
 * `parties` are the four columns the join selects, not whole link rows — the
 * declared `@ResponseSchema` describes neither, so this is written from
 * `subject.service.ts` `getSubject` and `subject-seam.ts` `SELECTION`.
 */
export const subjectDetailContract = z.object({
  subjectId: z.string(),
  organizationId: z.string(),
  subjectTypeId: z.string(),
  typeKey: z.string(),
  typeSingular: z.string(),
  title: z.string(),
  reference: z.string().nullable(),
  status: z.string().nullable(),
  fields: z.array(subjectTypeFieldContract),
  customFields: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  linkedPartyId: z.string().nullable(),
  resolvedVia: z.enum(["subject-record", "link-record"]),
  parties: z.array(z.object({
    partyId: z.string(),
    name: z.string(),
    relationship: z.string(),
    subjectPartyLinkId: z.string(),
  })),
});

export const subjectMutationContract = subjectItemContract;

export const subjectLinkContract = subjectPartyLinkRowContract;

export const subjectUnlinkContract = z.object({ unlinked: z.literal(true) });

/**
 * `SubjectService.listForParty` — the same link read from the party's side, and
 * a seven-column projection over a two-table join rather than a subject row.
 */
export const partySubjectsContract = z.object({
  data: z.array(z.object({
    subjectId: z.string(),
    title: z.string(),
    status: z.string().nullable(),
    subjectTypeId: z.string(),
    typeKey: z.string(),
    relationship: z.string(),
    subjectPartyLinkId: z.string(),
  })),
});
