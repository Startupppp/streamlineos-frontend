
export const OUTBOX_OPERATION_TYPES = [
  "stock.adjust",
  "pick.confirm",
  "receive.count",
  "scan.capture",
] as const;
export type OutboxOperationType = (typeof OUTBOX_OPERATION_TYPES)[number];

export type DecimalString = string;

interface OperationIdentity {
  clientOperationId: string;
  occurredAt: string;
}

export interface StockAdjustOperation extends OperationIdentity {
  type: "stock.adjust";
  productVariantId: number;
  locationId: number;
  quantityDelta: DecimalString;
  reasonCode?: string;
}

export interface PickConfirmOperation extends OperationIdentity {
  type: "pick.confirm";
  pickListId: number;
  pickLineId: number;
  quantityPicked: DecimalString;
}

export interface ReceiveCountLine {
  poLineId: number;
  quantityReceived: DecimalString;
  uomId?: number;
  discrepancyReason?: "SHORT" | "OVER" | "DAMAGED" | "WRONG_ITEM";
  qualityStatus?: "ACCEPTED" | "REJECTED";
  rejectionReason?: string;
  lotNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  serialNumbers?: string[];
}

export interface ReceiveCountOperation extends OperationIdentity {
  type: "receive.count";
  poId: number;
  receivedDate: string;
  locationId?: number;
  notes?: string;
  lines: ReceiveCountLine[];
}

export interface ScanCaptureOperation extends OperationIdentity {
  type: "scan.capture";
  payload: string;
}

export type OutboxOperation =
  | StockAdjustOperation
  | PickConfirmOperation
  | ReceiveCountOperation
  | ScanCaptureOperation;

export type OutboxOperationDraft =
  | Omit<StockAdjustOperation, keyof OperationIdentity>
  | Omit<PickConfirmOperation, keyof OperationIdentity>
  | Omit<ReceiveCountOperation, keyof OperationIdentity>
  | Omit<ScanCaptureOperation, keyof OperationIdentity>;

export type OutboxEntryStatus = "queued" | "in-flight" | "synced" | "conflict";

export type OutboxConflictKind =
  | "insufficient"
  | "stale"
  | "unauthorized"
  | "rejected";

export interface OutboxConflict {
  kind: OutboxConflictKind;
  code?: string;
  reason: string;
}

export interface OutboxEntry {
  readonly clientOperationId: string;
  readonly type: OutboxOperationType;
  readonly operation: OutboxOperation;
  readonly label?: string;
  readonly enqueuedAt: number;
  readonly attempts: number;
  readonly status: OutboxEntryStatus;
  readonly nextAttemptAt: number;
  readonly conflict?: OutboxConflict;
  readonly syncedAt?: number;
}

export interface OutboxCounts {
  queued: number;
  inFlight: number;
  conflict: number;
  synced: number;
}

export interface SyncOperationResult {
  clientOperationId: string;
  outcome: "applied" | "duplicate" | "conflict" | "failed";
  reason?: string;
  code?: string;
}

export interface SyncBatchResult {
  applied: number;
  duplicates: number;
  conflicts: number;
  failures: number;
  results: SyncOperationResult[];
}

export function countEntries(entries: readonly OutboxEntry[]): OutboxCounts {
  const counts: OutboxCounts = { queued: 0, inFlight: 0, conflict: 0, synced: 0 };
  for (const entry of entries) {
    if (entry.status === "queued") counts.queued += 1;
    else if (entry.status === "in-flight") counts.inFlight += 1;
    else if (entry.status === "conflict") counts.conflict += 1;
    else counts.synced += 1;
  }
  return counts;
}
