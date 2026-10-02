"use client";

import { useMemo } from "react";
import { countWorkdays } from "./leave-date-helpers";
import { findLeaveOverlap, leaveOverlapMessage, type LeaveSpan } from "./leave-overlap";
import { leaveLopHint } from "./leave-lop-hint";
import type { LeaveBalance, LeaveType } from "./components/leaves-shared";

export interface LeaveBalancePreviewValue {
  available: number;
  after: number;
  typeName: string;
}

export interface LeaveRequestValidation {
  requestedDays: number;
  balancePreview: LeaveBalancePreviewValue | null;
  balanceUnavailableFor: string | null;
  lopHint: string | null;
  overlapMessage: string | null;
  dayLimitError: string | null;
}

export interface LeaveRequestValidationInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  leaveTypes: readonly LeaveType[];
  balances: readonly LeaveBalance[];
  existingRequests: readonly LeaveSpan[];
  leaveMaxDays: Readonly<Record<string, number>>;
}

const EMPTY: LeaveRequestValidation = {
  requestedDays: 0,
  balancePreview: null,
  balanceUnavailableFor: null,
  lopHint: null,
  overlapMessage: null,
  dayLimitError: null,
};

export function useLeaveRequestValidation(
  input: LeaveRequestValidationInput,
): LeaveRequestValidation {
  const {
    leaveTypeId,
    startDate,
    endDate,
    halfDay,
    leaveTypes,
    balances,
    existingRequests,
    leaveMaxDays,
  } = input;

  return useMemo(() => {
    if (!leaveTypeId || !startDate || !endDate) return EMPTY;

    const requestedDays = halfDay ? 0.5 : countWorkdays(startDate, endDate);
    const selectedType = leaveTypes.find((t) => t.id.toString() === leaveTypeId);
    const overlap = findLeaveOverlap(existingRequests, startDate, endDate);
    const overlapMessage = overlap ? leaveOverlapMessage(overlap) : null;

    if (!selectedType) return { ...EMPTY, requestedDays, overlapMessage };

    const matchedBalance = balances.find((b) => b.leaveTypeId === selectedType.id);
    const available = matchedBalance ? Number(matchedBalance.balance ?? 0) : null;
    const balanceKnown = available !== null && Number.isFinite(available);

    const maxDays = leaveMaxDays[selectedType.name];
    const dayLimitError =
      maxDays !== undefined && requestedDays > maxDays
        ? `${selectedType.name} cannot exceed ${maxDays} days. You selected ${requestedDays} day${requestedDays !== 1 ? "s" : ""}.`
        : null;

    const entitledDaysPerYear =
      matchedBalance?.daysPerYear ?? selectedType.daysPerYear ?? null;

    return {
      requestedDays,
      balancePreview:
        balanceKnown && available !== null
          ? { available, after: available - requestedDays, typeName: selectedType.name }
          : null,
      balanceUnavailableFor: balanceKnown ? null : selectedType.name,
      lopHint: leaveLopHint({
        typeName: selectedType.name,
        entitledDaysPerYear,
        balanceKnown,
        availableDays: balanceKnown ? available : null,
        requestedDays,
      }),
      overlapMessage,
      dayLimitError,
    };
  }, [
    leaveTypeId,
    startDate,
    endDate,
    halfDay,
    leaveTypes,
    balances,
    existingRequests,
    leaveMaxDays,
  ]);
}
