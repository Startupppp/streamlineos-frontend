import type {
  ReportingCompiledColumn,
  ReportingFieldType,
  ReportingFilterNode,
} from "./reporting";

/**
 * The wire contract of `@Controller("crm/segments")`.
 *
 * The filter vocabulary is imported from `./reporting` rather than restated, and
 * that is not a shortcut — it is the same decision the backend makes. A segment's
 * criteria *are* a reporting `FilterNode`, produced by the same compiler's
 * grammar and validated by the same DTO, so a second declaration here would be a
 * second copy of a union that has to stay identical to a third one on the
 * server. Two copies of a discriminated union do not drift loudly; they drift
 * into a field that silently stops being sent.
 *
 * What a segment adds over a report is what this file declares: a name, a
 * source, and the two shapes an evaluation comes back in.
 */

export type SegmentFilterNode = ReportingFilterNode;
export type SegmentFieldType = ReportingFieldType;

/** One field a criterion may name, from `GET /crm/segments/sources`. */
export interface SegmentSourceField {
  readonly name: string;
  readonly label: string;
  readonly type: SegmentFieldType;
}

/**
 * One segmentable source.
 *
 * Relations arrive flattened into `fields` with dotted names (`party.industry`),
 * already usable verbatim as a criterion's field — a segment only ever filters,
 * so there is nothing a second level of structure would buy the builder.
 */
export interface SegmentSource {
  readonly key: string;
  readonly label: string;
  readonly fields: readonly SegmentSourceField[];
}

/**
 * One row of `GET /crm/segments`.
 *
 * The criteria tree is deliberately absent: the list never needs it and it is
 * the largest field on the row.
 */
export interface SegmentSummary {
  readonly segmentId: string;
  readonly name: string;
  readonly description: string | null;
  readonly sourceKey: string;
  readonly createdByUserId: string | null;
  /** Projected from `users.name` by a LEFT JOIN; null for a departed author. */
  readonly createdByName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * `GET /crm/segments/:segmentId`, which returns the whole stored row.
 *
 * Not an extension of the summary: the list projects an author name through a
 * join and the row read does not, so inheriting would claim a field the detail
 * response has never carried.
 */
export interface Segment {
  readonly segmentId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string | null;
  readonly sourceKey: string;
  readonly criteria: SegmentFilterNode;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateSegmentInput {
  readonly name: string;
  readonly description?: string;
  readonly source: string;
  readonly criteria: SegmentFilterNode;
}

/**
 * `description: null` clears it, `undefined` leaves it alone — the update schema
 * is `.nullable().optional()` on the server and the two mean different things.
 *
 * There is no `source`. Every criterion names a field of one source, so
 * re-pointing a segment would leave criteria referencing fields the new source
 * does not have; the server refuses it and building a different segment is a
 * create.
 */
export interface UpdateSegmentInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly criteria?: SegmentFilterNode;
}

/** `POST /crm/segments/preview` — how many match, before anybody names them. */
export interface SegmentPreviewInput {
  readonly source: string;
  readonly criteria: SegmentFilterNode;
}

/**
 * The preview answer: a count, and nothing else.
 *
 * No rows, deliberately. A preview that returned rows would be an ad-hoc query
 * endpoint with no saved artefact and no audit row, which is what
 * `POST /crm/reporting/run` already is.
 */
export interface SegmentPreviewResult {
  readonly total: number;
}

/**
 * `GET /crm/segments/:segmentId/members` — who is in it, evaluated now.
 *
 * `total` is every matching row and `rows` is a bounded sample of them, which is
 * why both exist. There is no page number: no registry source publishes a row
 * identifier, so there is no unique ordering to page on and an offset would
 * repeat and skip rows between pages. The count is the number that is always
 * right.
 */
export interface SegmentMembers {
  readonly columns: readonly ReportingCompiledColumn[];
  readonly rows: readonly Record<string, unknown>[];
  readonly total: number;
  /** The sample stops short of `total`. */
  readonly truncated: boolean;
}

/** The server's cap on one members read, restated so the hook cannot exceed it. */
export const SEGMENT_MEMBER_PREVIEW_MAX = 100;
