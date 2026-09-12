import type { ApiOracle } from "./api-oracle";
import { today, type SeedTarget } from "./documents-receiving";

export interface PutawayTaskLine {
  id: number;
  sku: string;
  quantity: string;
  to_location_id: number | null;
  to_location_code: string | null;
  suggestions: Array<{ locationId: number; code: string; fits: boolean }>;
}

export interface ClaimedPutawayTask {
  taskId: number;
  taskNumber: string;
  fromLocationId: number;
  line: PutawayTaskLine;
}

/**
 * A putaway task standing in THIS operator's queue.
 *
 * Claimed, not merely raised: the RF queue asks for `assignment=MINE`, and an
 * unclaimed task is somebody else's work as far as that screen is concerned —
 * so a spec that raised one without claiming it would find an empty queue and
 * conclude the screen was broken.
 */
export async function claimedPutawayTask(
  api: ApiOracle,
  grnId: number,
): Promise<ClaimedPutawayTask> {
  const raised = await api.post<{ taskId: number; taskNumber: string }>(
    "/inventory/putaway/tasks",
    { grnId },
  );
  await api.post(`/inventory/putaway/tasks/${raised.taskId}/claim`);

  const detail = await api.get<{
    task: { fromLocationId: number };
    lines: PutawayTaskLine[];
  }>(`/inventory/putaway/tasks/${raised.taskId}`);

  const line = detail.lines?.[0];
  if (!line) throw new Error(`Putaway task ${raised.taskNumber} has no lines.`);
  // The RF runner refuses to confirm a line with no destination, and says so in
  // a toast rather than posting. Failing here instead names the fixture.
  const destination = line.to_location_id ?? line.suggestions?.[0]?.locationId ?? null;
  if (destination === null) {
    throw new Error(
      `Putaway task ${raised.taskNumber} line ${line.id} has no destination bin and no suggestion; ` +
        `the RF runner cannot confirm it. Free capacity in another bin of this warehouse.`,
    );
  }

  return {
    taskId: raised.taskId,
    taskNumber: raised.taskNumber,
    fromLocationId: detail.task.fromLocationId,
    line,
  };
}

export interface PickWaveLine {
  id: number;
  sku: string;
  location_id: number | null;
  location_code: string | null;
  quantity_to_pick: string;
  quantity_picked: string;
  line_closed: boolean;
}

export interface ClaimedPickWave {
  pickListId: number;
  pickNumber: string;
  soId: number;
  line: PickWaveLine;
}

/**
 * A pick wave standing in THIS operator's queue, with its lines allocated.
 *
 * The sales order is confirmed rather than merely created: `createWave` refuses
 * anything outside `CONFIRMED` / `RESERVED` / `PARTIALLY_RESERVED` and names
 * the offending order, so a draft would fail the seed rather than the walk.
 *
 * A line the allocator could not resolve is refused here too. `confirmPick`
 * will not close a line against a null location — correctly — and a wave seeded
 * with one produces a walk that cannot be finished, which reads as a UI defect.
 */
export async function claimedPickWave(
  api: ApiOracle,
  target: SeedTarget,
  qty: number,
): Promise<ClaimedPickWave> {
  const so = await api.post<{ id: number }>("/inventory/sales-orders", {
    orderDate: today(),
    warehouseId: target.warehouseId,
    currency: "INR",
    notes: "e2e pick wave",
    lines: [
      {
        productVariantId: target.variantId,
        quantity: qty,
        unitPrice: "5.0000",
        taxRate: "0",
        lineOrder: 0,
      },
    ],
  });
  await api.post(`/inventory/sales-orders/${so.id}/confirm`);

  const wave = await api.post<{
    pickListId: number;
    pickNumber: string;
    unallocatedLines: number;
  }>("/inventory/picking/waves", { warehouseId: target.warehouseId, soIds: [so.id] });

  if (wave.unallocatedLines > 0) {
    throw new Error(
      `Wave ${wave.pickNumber} has ${wave.unallocatedLines} line(s) the allocator could not place; ` +
        `there is not enough available stock of ${target.variantSku} in warehouse ${target.warehouseId}.`,
    );
  }

  await api.post(`/inventory/picking/waves/${wave.pickListId}/claim`);

  const detail = await api.get<{ lines: PickWaveLine[] }>(
    `/inventory/picking/waves/${wave.pickListId}`,
  );
  const line = detail.lines?.[0];
  if (!line) throw new Error(`Wave ${wave.pickNumber} has no lines.`);
  if (line.location_id === null) {
    throw new Error(`Wave ${wave.pickNumber} line ${line.id} has no location; it cannot be confirmed.`);
  }

  return { pickListId: wave.pickListId, pickNumber: wave.pickNumber, soId: so.id, line };
}
