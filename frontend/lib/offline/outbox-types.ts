/**
 * B8 — what a device holds while it has no signal.
 *
 * The shapes here mirror `inventory/sync/dto/sync.schemas.ts` exactly, because
 * a queued entry is stored as the request body it will eventually be sent as.
 * Nothing is re-derived at drain time: the operation that goes on the wire is
 * the byte-for-byte object that was built when the operator pressed the button,
 * including its id. That is the whole correctness argument for this unit, and
 * it is an argument about *storage*, not about the network code — a payload
 * rebuilt at send time is a payload that can be rebuilt differently, and a
 * regenerated id posts a second movement.
 */

/** Every operation kind `POST /inventory/sync/batch` accepts. */
export const OUTBOX_OPERATION_TYPES = [
  "stock.adjust",
  "pick.confirm",
  "receive.count",
  "scan.capture",
] as const;
export type OutboxOperationType = (typeof OUTBOX_OPERATION_TYPES)[number];

/**
 * Quantities are decimal strings, end to end.
 *
 * Not a nicety: `Number("10.0001")` is a float, and a picked quantity or a
 * scale reading that has been through one is a ledger row that no longer says
 * what the operator saw. The type is the enforcement — there is no number here
 * to accidentally do arithmetic on.
 */
export type DecimalString = string;

interface OperationIdentity {
  /**
   * The stable client-generated `Idempotency-Key`, minted **once** when the
   * operation is enqueued and never again. A retry that regenerates it is a
   * second movement, and the operator has no way to see that it happened.
   */
  clientOperationId: string;
  /** When the operator did it. The server replays in this order, not arrival order. */
  occurredAt: string;
}

export interface StockAdjustOperation extends OperationIdentity {
  type: "stock.adjust";
  productVariantId: number;
  locationId: number;
  /**
   * Signed, and the sign is the instruction. A queued removal of five is
   * `"-5.0000"` — never `"5.0000"` beside a direction flag, which is a second
   * place for the same fact to be stated and the first place for it to
   * disagree with the server's reading of it.
   */
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
  /** The scanner's payload, verbatim — separators and all. */
  payload: string;
}

export type OutboxOperation =
  | StockAdjustOperation
  | PickConfirmOperation
  | ReceiveCountOperation
  | ScanCaptureOperation;

/** The operation as the caller hands it over, before an id and a clock are attached. */
export type OutboxOperationDraft =
  | Omit<StockAdjustOperation, keyof OperationIdentity>
  | Omit<PickConfirmOperation, keyof OperationIdentity>
  | Omit<ReceiveCountOperation, keyof OperationIdentity>
  | Omit<ScanCaptureOperation, keyof OperationIdentity>;

/**
 * Four states, and the ordering between two of them is the point.
 *
 * `in-flight` exists so that `synced` can mean one thing only: the server
 * acknowledged this operation. A queue that marks an entry done when the
 * request leaves has told the operator their count landed before anybody knows
 * whether it did, and the entry is gone by the time the answer arrives.
 */
export type OutboxEntryStatus = "queued" | "in-flight" | "synced" | "conflict";

/**
 * The three answers an operator can actually act on, plus one for everything
 * else.
 *
 *   `insufficient` — the stock is not there. Show them what is.
 *   `stale`        — the document moved on. Show them what changed.
 *   `unauthorized` — the session expired. Re-auth, then replay; never drop.
 *   `rejected`     — refused for a reason we cannot categorise. Show it verbatim.
 *
 * A conflict the operator cannot act on is noise, so a category exists only
 * where it changes what they are offered.
 */
export type OutboxConflictKind =
  | "insufficient"
  | "stale"
  | "unauthorized"
  | "rejected";

export interface OutboxConflict {
  kind: OutboxConflictKind;
  /** The server's machine-readable name for it, when it gave one. */
  code?: string;
  /** What to show a human. Always populated, always via `getErrorMessage`. */
  reason: string;
}

export interface OutboxEntry {
  /** Primary key in the store, and the operation's stable idempotency key. */
  readonly clientOperationId: string;
  readonly type: OutboxOperationType;
  /**
   * The request body, frozen at enqueue. Sent verbatim; never rebuilt.
   */
  readonly operation: OutboxOperation;
  /**
   * What the operator saw when they queued it — "SKU-4471 · Bin A-12".
   *
   * Captured at enqueue because it cannot be resolved later: the device is
   * offline by definition, and the whole reason it queued anything is that it
   * cannot reach the catalogue. Without this the queue can only render the ids
   * in the payload, and a visible id is a bug. Never sent — the server's DTOs
   * are `.strict()` and this is a label for a human, not part of the command.
   */
  readonly label?: string;
  /** Epoch millis the operator pressed the button. */
  readonly enqueuedAt: number;
  /** How many times this has been sent. Drives the backoff, and only that. */
  readonly attempts: number;
  readonly status: OutboxEntryStatus;
  /** Epoch millis before which the drain will not try this entry again. */
  readonly nextAttemptAt: number;
  /** Set only while `status === "conflict"`. */
  readonly conflict?: OutboxConflict;
  /** Epoch millis the server acknowledged it. Set only with `synced`. */
  readonly syncedAt?: number;
}

export interface OutboxCounts {
  queued: number;
  inFlight: number;
  conflict: number;
  synced: number;
}

/** The per-operation verdict `POST /inventory/sync/batch` returns. */
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
