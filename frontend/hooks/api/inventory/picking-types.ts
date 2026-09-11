import type {
  PickExceptionReason,
  PickExceptionResolution,
  PickExceptionStatus,
} from "@/features/inventory/lib/inventory-status";

export type PickWaveStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PickWaveAssignment = "ANY" | "MINE" | "UNCLAIMED";
export type PickExceptionOwnership = "ANY" | "MINE";
export type { PickExceptionReason, PickExceptionResolution, PickExceptionStatus };

export interface PickWaveSummary {
  id: number;
  pickNumber: string;
  status: PickWaveStatus;
  warehouseId: number | null;
  warehouseName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  claimedAt: string | null;
  createdAt: string;
  orderCount: number;
  lineCount: number;
  linesClosed: number;
  /** B5. How many of this wave's lines are waiting on a reviewer. */
  openExceptions: number;
}

export interface PickWaveListResponse {
  items: PickWaveSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PickWaveFilters {
  page?: number;
  limit?: number;
  status?: PickWaveStatus;
  warehouseId?: number;
  assignment?: PickWaveAssignment;
}

/**
 * One task on the walk.
 *
 * Snake-cased because the backend returns the projection row as it reads it —
 * the wave detail is a raw SQL result rather than a mapped DTO, and renaming it
 * on the way through would be a second contract to keep in step.
 */
export interface PickWaveLine {
  id: number;
  so_line_id: number | null;
  so_number: string | null;
  product_variant_id: number;
  sku: string;
  variant_name: string;
  location_id: number | null;
  location_code: string | null;
  lot_id: number | null;
  lot_number: string | null;
  serial_id: number | null;
  serial_number: string | null;
  quantity_to_pick: string;
  quantity_picked: string;
  exception_reason: PickExceptionReason | null;
  exception_notes: string | null;
  exception_status: PickExceptionStatus | null;
  exception_resolution: PickExceptionResolution | null;
  exception_owner_id: string | null;
  exception_owner_name: string | null;
  exception_location_code: string | null;
  substitute_variant_id: number | null;
  substitute_sku: string | null;
  substitute_quantity: string | null;
  /**
   * B5. Whether the server considers this task finished with.
   *
   * Sent rather than derived here. The rule now has three clauses — picked in
   * full, a closing reason, and a reviewer's signature where one is required —
   * and a client copy of it would be a fourth place for it to drift, showing a
   * picker a finished row the wave still considers outstanding.
   */
  line_closed: boolean;
}

export interface PickWaveDetail {
  id: number;
  pickNumber: string;
  status: PickWaveStatus;
  soId: number | null;
  warehouseId: number | null;
  assignedTo: string | null;
  claimedAt: string | null;
  createdAt: string;
  lines: PickWaveLine[];
}

export interface CreatePickWaveInput {
  warehouseId: number;
  soIds: number[];
}

export interface CreatePickWaveResult {
  pickListId: number;
  pickNumber: string;
  orderCount: number;
  lineCount: number;
  unallocatedLines: number;
}

export interface ConfirmPickInput {
  pickListId: number;
  pickLineId: number;
  /** Decimal string at scale 4 — this moves a reservation into the picked bucket. */
  quantityPicked: string;
  locationId?: number;
  scannedPayload?: string;
}

export interface ConfirmPickResult {
  pickLineId: number;
  quantityPicked: string;
  waveComplete: boolean;
  pickedBy: string;
}

export interface ReportPickExceptionInput {
  pickListId: number;
  pickLineId: number;
  reason: PickExceptionReason;
  notes?: string;
  /** `WRONG_LOCATION` only — where the picker actually found the goods. */
  foundLocationId?: number;
  /** `SUBSTITUTED` only. Posted to its own endpoint, which has its own key. */
  substituteVariantId?: number;
  quantityPicked?: string;
}

export interface PickExceptionResult {
  pickLineId: number;
  reason: PickExceptionReason;
  status: PickExceptionStatus;
  ownerUserId: string | null;
  substituteVariantId: number | null;
  substituteQuantity: string | null;
  quantityPicked: string;
  waveComplete: boolean;
  reportedBy: string;
}
