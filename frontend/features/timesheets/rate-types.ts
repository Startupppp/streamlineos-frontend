import type { BillingType } from "./types";

export interface TimesheetRate {
  id: number;
  orgId: string;
  rateCardId: number | null;
  projectId: number | null;
  userMembershipId: number | null;
  clientId: number | null;
  taskId: number | null;
  billingType: BillingType;
  billRate: string;
  costRate: string | null;
  currency: string;
  priority: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetRateCard {
  id: number;
  orgId: string;
  name: string;
  currency: string;
  isDefault: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RatesResponse {
  rates: TimesheetRate[];
  rateCards: TimesheetRateCard[];
}

export interface CreateRateInput {
  projectId?: number;
  userId?: string;
  taskId?: number;
  clientId?: number;
  billingType?: BillingType;
  billRate: number;
  costRate?: number;
  currency?: string;
  priority?: number;
  rateCardId?: number;
}
