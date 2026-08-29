import type { OutboxEntry, OutboxOperation } from "@/lib/offline/outbox-types";

/**
 * B8 — what a queued operation says it is, without a lookup.
 *
 * A device with a queue is a device that cannot reach the catalogue, so the
 * only names available are the ones captured at enqueue. Where a label was
 * captured it is used; where it was not, the description falls back to the kind
 * of work and its quantity — both meaningful to the operator — and never to the
 * numeric ids in the payload. A visible id is a bug, and it is worse here than
 * elsewhere: an operator reconciling a queue against a shelf cannot look one
 * up.
 */
const KIND_LABELS: Readonly<Record<OutboxEntry["type"], string>> = {
  "stock.adjust": "Stock correction",
  "pick.confirm": "Pick confirmation",
  "receive.count": "Receive count",
  "scan.capture": "Scan",
};

export function outboxKindLabel(type: OutboxEntry["type"]): string {
  return KIND_LABELS[type];
}

/**
 * The quantity this operation moves, as the string it will be sent as.
 *
 * Never parsed. A picked quantity and a scale reading cross the wire as decimal
 * strings precisely so nothing turns them into floats, and formatting one for
 * display through `Number()` would do exactly that on the screen the operator
 * checks their work against.
 */
export function outboxQuantityText(operation: OutboxOperation): string | null {
  if (operation.type === "stock.adjust") {
    return operation.quantityDelta.startsWith("-")
      ? operation.quantityDelta
      : `+${operation.quantityDelta}`;
  }
  if (operation.type === "pick.confirm") return operation.quantityPicked;
  if (operation.type === "receive.count") {
    return `${String(operation.lines.length)} line${operation.lines.length === 1 ? "" : "s"}`;
  }
  return null;
}

export function outboxEntryDescription(entry: OutboxEntry): string {
  if (entry.label) return entry.label;
  if (entry.operation.type === "scan.capture") return entry.operation.payload;
  const quantity = outboxQuantityText(entry.operation);
  return quantity ? `${outboxKindLabel(entry.type)} · ${quantity}` : outboxKindLabel(entry.type);
}
