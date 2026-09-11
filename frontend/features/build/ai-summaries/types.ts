import type { Citation } from "@/components/ai";

export interface SnapshotStructured {
  highlights: string[];
  blockers: string[];
  nextActions: string[];
}

export interface FieldDiff {
  added: string[];
  removed: string[];
  changed: string[];
}

export interface SnapshotDiff {
  highlights: FieldDiff;
  blockers: FieldDiff;
  nextActions: FieldDiff;
  isSameSnapshot: boolean;
}

export interface AiSummarySnapshot {
  id: number;
  orgId: string;
  entityType: string;
  entityId: string;
  summary: string;
  structured: SnapshotStructured;
  citations: Citation[] | null;
  correlationId: string | null;
  generatedBy: string | null;
  createdAt: string;
}

export interface SnapshotWithDiff {
  snapshot: AiSummarySnapshot;
  diff: SnapshotDiff | null;
}

export interface SaveSnapshotPayload {
  summary: string;
  structured: SnapshotStructured;
  citations?: Citation[];
  correlationId?: string;
  confidence?: number;
}
