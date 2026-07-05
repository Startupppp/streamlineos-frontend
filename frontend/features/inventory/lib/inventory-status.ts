export type PoStatus = "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED" | "CLOSED" | "CANCELLED";
export type SoStatus = "DRAFT" | "CONFIRMED" | "PARTIALLY_RESERVED" | "RESERVED" | "PICKED" | "PACKED" | "PARTIALLY_SHIPPED" | "SHIPPED" | "INVOICED" | "CLOSED" | "CANCELLED";
export type TransferStatus = "PENDING" | "RESERVED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
export type AdjustmentStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "POSTED" | "CANCELLED";
export type GrnQuality = "ACCEPTED" | "REJECTED";
export type CycleCountStatus = "PLANNED" | "COUNTING" | "REVIEW" | "POSTED" | "CANCELLED";
export type InspectionStatus = "PENDING" | "IN_PROGRESS" | "PASSED" | "FAILED" | "DISPOSITION_REQUIRED" | "COMPLETED" | "CANCELLED";
export type ShipmentStatus = "DRAFT" | "PACKED" | "LABEL_CREATED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type LoadStatus = "DRAFT" | "DISPATCHED" | "ARRIVED" | "CLOSED" | "CANCELLED";
export type ReservationStatus = "ACTIVE" | "CONSUMED" | "RELEASED" | "EXPIRED";
export type LotStatus = "ACTIVE" | "EXPIRED" | "BLOCKED" | "CONSUMED" | "RECALLED";
export type SerialStatus = "IN_STOCK" | "RESERVED" | "SHIPPED" | "RETURNED" | "SCRAPPED" | "QUARANTINE";
export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type SyncStatus = "IDLE" | "SYNCING" | "SUCCESS" | "ERROR" | "PAUSED";
export type QualityHoldStatus = "ACTIVE" | "RELEASED" | "EXPIRED";
export type RecallStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";
export type PackageStatus = "OPEN" | "CLOSED" | "SHIPPED";

const INFO = "bg-blue-50 text-blue-700 border-blue-200";
const SUCCESS = "bg-emerald-50 text-emerald-700 border-emerald-200";
const WARNING = "bg-amber-50 text-amber-700 border-amber-200";
const DANGER = "bg-red-50 text-red-700 border-red-200";
const NEUTRAL = "bg-slate-100 text-slate-700 border-slate-200";

export const PO_STATUS_BADGE: Record<PoStatus, string> = {
  DRAFT: INFO,
  SENT: INFO,
  PARTIAL: WARNING,
  RECEIVED: SUCCESS,
  CLOSED: NEUTRAL,
  CANCELLED: DANGER,
};

export const PO_STATUS_LABEL: Record<PoStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIAL: "Partially Received",
  RECEIVED: "Received",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const SO_STATUS_BADGE: Record<SoStatus, string> = {
  DRAFT: INFO,
  CONFIRMED: INFO,
  PARTIALLY_RESERVED: WARNING,
  RESERVED: INFO,
  PICKED: WARNING,
  PACKED: WARNING,
  PARTIALLY_SHIPPED: WARNING,
  SHIPPED: SUCCESS,
  INVOICED: SUCCESS,
  CLOSED: NEUTRAL,
  CANCELLED: DANGER,
};

export const SO_STATUS_LABEL: Record<SoStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PARTIALLY_RESERVED: "Partially Reserved",
  RESERVED: "Reserved",
  PICKED: "Picked",
  PACKED: "Packed",
  PARTIALLY_SHIPPED: "Partially Shipped",
  SHIPPED: "Shipped",
  INVOICED: "Invoiced",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const TRANSFER_STATUS_BADGE: Record<TransferStatus, string> = {
  PENDING: INFO,
  RESERVED: INFO,
  IN_TRANSIT: WARNING,
  COMPLETED: SUCCESS,
  CANCELLED: DANGER,
};

export const TRANSFER_STATUS_LABEL: Record<TransferStatus, string> = {
  PENDING: "Pending",
  RESERVED: "Reserved",
  IN_TRANSIT: "In Transit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ADJUSTMENT_STATUS_BADGE: Record<AdjustmentStatus, string> = {
  DRAFT: INFO,
  PENDING_APPROVAL: WARNING,
  APPROVED: INFO,
  POSTED: SUCCESS,
  CANCELLED: DANGER,
};

export const ADJUSTMENT_STATUS_LABEL: Record<AdjustmentStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
};

export const GRN_QUALITY_BADGE: Record<GrnQuality, string> = {
  ACCEPTED: SUCCESS,
  REJECTED: DANGER,
};

export const GRN_QUALITY_LABEL: Record<GrnQuality, string> = {
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

export const CYCLE_COUNT_STATUS_BADGE: Record<CycleCountStatus, string> = {
  PLANNED: INFO,
  COUNTING: WARNING,
  REVIEW: WARNING,
  POSTED: SUCCESS,
  CANCELLED: DANGER,
};

export const CYCLE_COUNT_STATUS_LABEL: Record<CycleCountStatus, string> = {
  PLANNED: "Planned",
  COUNTING: "Counting",
  REVIEW: "Under Review",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
};

export const INSPECTION_STATUS_BADGE: Record<InspectionStatus, string> = {
  PENDING: INFO,
  IN_PROGRESS: WARNING,
  PASSED: SUCCESS,
  FAILED: DANGER,
  DISPOSITION_REQUIRED: WARNING,
  COMPLETED: SUCCESS,
  CANCELLED: NEUTRAL,
};

export const INSPECTION_STATUS_LABEL: Record<InspectionStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  PASSED: "Passed",
  FAILED: "Failed",
  DISPOSITION_REQUIRED: "Disposition Required",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const SHIPMENT_STATUS_BADGE: Record<ShipmentStatus, string> = {
  DRAFT: INFO,
  PACKED: WARNING,
  LABEL_CREATED: WARNING,
  SHIPPED: INFO,
  DELIVERED: SUCCESS,
  CANCELLED: DANGER,
};

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  DRAFT: "Draft",
  PACKED: "Packed",
  LABEL_CREATED: "Label Created",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const LOAD_STATUS_BADGE: Record<LoadStatus, string> = {
  DRAFT: INFO,
  DISPATCHED: WARNING,
  ARRIVED: SUCCESS,
  CLOSED: NEUTRAL,
  CANCELLED: DANGER,
};

export const LOAD_STATUS_LABEL: Record<LoadStatus, string> = {
  DRAFT: "Draft",
  DISPATCHED: "Dispatched",
  ARRIVED: "Arrived",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const RESERVATION_STATUS_BADGE: Record<ReservationStatus, string> = {
  ACTIVE: SUCCESS,
  CONSUMED: NEUTRAL,
  RELEASED: NEUTRAL,
  EXPIRED: DANGER,
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  ACTIVE: "Active",
  CONSUMED: "Consumed",
  RELEASED: "Released",
  EXPIRED: "Expired",
};

export const LOT_STATUS_BADGE: Record<LotStatus, string> = {
  ACTIVE: SUCCESS,
  EXPIRED: DANGER,
  BLOCKED: WARNING,
  CONSUMED: NEUTRAL,
  RECALLED: DANGER,
};

export const LOT_STATUS_LABEL: Record<LotStatus, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  BLOCKED: "Blocked",
  CONSUMED: "Consumed",
  RECALLED: "Recalled",
};

export const SERIAL_STATUS_BADGE: Record<SerialStatus, string> = {
  IN_STOCK: SUCCESS,
  RESERVED: WARNING,
  SHIPPED: INFO,
  RETURNED: WARNING,
  SCRAPPED: DANGER,
  QUARANTINE: WARNING,
};

export const SERIAL_STATUS_LABEL: Record<SerialStatus, string> = {
  IN_STOCK: "In Stock",
  RESERVED: "Reserved",
  SHIPPED: "Shipped",
  RETURNED: "Returned",
  SCRAPPED: "Scrapped",
  QUARANTINE: "Quarantine",
};

export const JOB_STATUS_BADGE: Record<JobStatus, string> = {
  PENDING: INFO,
  PROCESSING: WARNING,
  COMPLETED: SUCCESS,
  FAILED: DANGER,
  CANCELLED: NEUTRAL,
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const SYNC_STATUS_BADGE: Record<SyncStatus, string> = {
  IDLE: NEUTRAL,
  SYNCING: WARNING,
  SUCCESS: SUCCESS,
  ERROR: DANGER,
  PAUSED: NEUTRAL,
};

export const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  IDLE: "Idle",
  SYNCING: "Syncing",
  SUCCESS: "Synced",
  ERROR: "Error",
  PAUSED: "Paused",
};

export const QUALITY_HOLD_STATUS_BADGE: Record<QualityHoldStatus, string> = {
  ACTIVE: DANGER,
  RELEASED: SUCCESS,
  EXPIRED: WARNING,
};

export const QUALITY_HOLD_STATUS_LABEL: Record<QualityHoldStatus, string> = {
  ACTIVE: "On Hold",
  RELEASED: "Released",
  EXPIRED: "Expired",
};

export const RECALL_STATUS_BADGE: Record<RecallStatus, string> = {
  OPEN: DANGER,
  IN_PROGRESS: WARNING,
  CLOSED: NEUTRAL,
};

export const RECALL_STATUS_LABEL: Record<RecallStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};

export const PACKAGE_STATUS_BADGE: Record<PackageStatus, string> = {
  OPEN: INFO,
  CLOSED: NEUTRAL,
  SHIPPED: SUCCESS,
};

export const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  SHIPPED: "Shipped",
};
