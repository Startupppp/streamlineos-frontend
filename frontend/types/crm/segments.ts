import type {
  ReportingCompiledColumn,
  ReportingFieldType,
  ReportingFilterNode,
} from "./reporting";


export interface SegmentSourceField {
  readonly name: string;
  readonly label: string;
  readonly type: ReportingFieldType;
}

export interface SegmentSource {
  readonly key: string;
  readonly label: string;
  readonly fields: readonly SegmentSourceField[];
}

export interface SegmentSummary {
  readonly segmentId: string;
  readonly name: string;
  readonly description: string | null;
  readonly sourceKey: string;
  readonly createdByUserId: string | null;
  readonly createdByName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Segment {
  readonly segmentId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string | null;
  readonly sourceKey: string;
  readonly criteria: ReportingFilterNode;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateSegmentInput {
  readonly name: string;
  readonly description?: string;
  readonly source: string;
  readonly criteria: ReportingFilterNode;
}

export interface UpdateSegmentInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly criteria?: ReportingFilterNode;
}

export interface SegmentPreviewInput {
  readonly source: string;
  readonly criteria: ReportingFilterNode;
}

export interface SegmentPreviewResult {
  readonly total: number;
}

export interface SegmentMembers {
  readonly columns: readonly ReportingCompiledColumn[];
  readonly rows: readonly Record<string, unknown>[];
  readonly total: number;
  readonly truncated: boolean;
}

export const SEGMENT_MEMBER_PREVIEW_MAX = 100;
