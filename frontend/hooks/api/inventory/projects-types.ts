/**
 * B1 — the project shapes, and the one place a decimal becomes a number.
 *
 * Quantities cross the wire as **strings**: a `numeric` that arrives as a JSON
 * float has already been through a binary double, and a quantity that reads
 * 79.99999999999999 is a discrepancy no stock count will explain. The
 * conversion happens here, once, so no component has to remember why.
 */

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type RequirementStatus =
  | "DRAFT" | "REQUESTED" | "RESERVED" | "PARTIALLY_FULFILLED" | "FULFILLED" | "CANCELLED";
export type RiskReason = "SHORT_AND_DUE" | "SHORT_NO_STOCK" | null;

export function num(v: string | number | null | undefined): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export interface ProjectListItem {
  id: number;
  code: string;
  name: string;
  clientId: number | null;
  city: string | null;
  zone: string | null;
  status: ProjectStatus;
  startsOn: string | null;
  endsOn: string | null;
  siteContactName: string | null;
  createdAt: string;
  updatedAt: string;
  openRequirements: number;
  overdueRequirements: number;
}

export interface RequirementCoverage {
  requirementId: number;
  requiredQty: number;
  reservedQty: number;
  fulfilledQty: number;
  shortfallQty: number;
  availableQty: number;
  atRisk: boolean;
  riskReason: RiskReason;
}

export interface ProjectRequirement {
  id: number;
  projectId: number;
  productVariantId: number;
  warehouseId: number | null;
  requiredQty: number;
  fulfilledQty: number;
  requiredBy: string | null;
  status: RequirementStatus;
  notes: string | null;
  createdAt: string;
  variantSku: string;
  variantName: string | null;
  productId: number;
  productName: string;
  productSku: string;
  brand: string | null;
  materialGrade: string | null;
  dimensionLabel: string | null;
  imageUrl: string | null;
  leadTimeDays: number | null;
  warehouseName: string | null;
  warehouseCode: string | null;
  warehouseZone: string | null;
  coverage: RequirementCoverage | null;
}

export interface ProjectDetail {
  id: number;
  code: string;
  name: string;
  clientId: number | null;
  siteAddress: string | null;
  city: string | null;
  zone: string | null;
  siteContactName: string | null;
  siteContactPhone: string | null;
  status: ProjectStatus;
  startsOn: string | null;
  endsOn: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  requirements: ProjectRequirement[];
}

export interface AtRiskRequirement extends RequirementCoverage {
  id: number;
  projectId: number;
  projectCode: string;
  projectName: string;
  projectZone: string | null;
  productName: string;
  variantSku: string;
  requiredBy: string | null;
  status: RequirementStatus;
}

export interface RawCoverage {
  requirementId: string | number;
  requiredQty: string | number | null;
  reservedQty: string | number | null;
  fulfilledQty: string | number | null;
  shortfallQty: string | number | null;
  availableQty: string | number | null;
  atRisk: boolean | string | null;
  riskReason: string | null;
}

export interface RawAtRiskRequirement {
  id: string | number;
  projectId: string | number;
  projectCode: string | null;
  projectName: string | null;
  projectZone: string | null;
  productName: string | null;
  variantSku: string | null;
  requiredBy: string | null;
  status: RequirementStatus;
  coverage: RawCoverage;
}

function toRiskReason(value: string | null): RiskReason {
  if (value === "SHORT_AND_DUE" || value === "SHORT_NO_STOCK") return value;
  return null;
}

export function coverageOf(c: RawCoverage): RequirementCoverage {
  return {
    requirementId: Number(c.requirementId),
    requiredQty: num(c.requiredQty),
    reservedQty: num(c.reservedQty),
    fulfilledQty: num(c.fulfilledQty),
    shortfallQty: num(c.shortfallQty),
    availableQty: num(c.availableQty),
    atRisk: Boolean(c.atRisk),
    riskReason: toRiskReason(c.riskReason),
  };
}

export function toCoverage(c: RawCoverage | null): RequirementCoverage | null {
  return c ? coverageOf(c) : null;
}
