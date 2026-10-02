import { IST_TIME_ZONE } from "@/lib/hrms/payroll-cutoff";
import { getUserDisplayName } from "@/lib/person-display";
import type { PersonSummary } from "@/components/shared/person-drawer";
import { HR_WORKFLOW_OBJECT_TYPE_LABELS } from "@/types/hr/workflows";
import {
  approvalRouteTargetLabel,
  formatDateRange,
  type LeaveRowApprovalRoute,
} from "@/features/hr/workflows/leave-approval-row-format";
import type { ActionCenterItem } from "@/features/hr/action-center/queue-item";

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function istDayKey(
  value: string | Date | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && DAY_KEY.test(value)) return value;
  const parsed = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: IST_TIME_ZONE,
  }).format(parsed);
}

function isoOrNull(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function joinNotes(notes: readonly (string | null)[]): string | null {
  const kept = notes.filter((note): note is string => Boolean(note));
  return kept.length > 0 ? kept.join(" · ") : null;
}

export interface LeaveQueueRow {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  lopDays?: string | null;
  createdAt?: string | null;
  leaveType?: { name: string } | null;
  user?: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  } | null;
  approvalRoute?: LeaveRowApprovalRoute | null;
}

export function normaliseLeaveItem(row: LeaveQueueRow): ActionCenterItem {
  const lopDays = Number(row.lopDays ?? "0");
  const halfDay = row.isHalfDay === true ? " (half day)" : "";
  return {
    id: `leave:${row.id}`,
    source: "leave",
    sourceId: row.id,
    facet: "leave",
    type: row.leaveType?.name ?? "Leave",
    requester: row.user
      ? {
          userId: row.user.id,
          name: row.user.name ?? null,
          firstName: row.user.firstName ?? null,
          lastName: row.user.lastName ?? null,
          image: row.user.image ?? null,
        }
      : null,
    requesterLabel: row.user ? getUserDisplayName(row.user) : "Unknown",
    dateRange: `${formatDateRange(row.startDate, row.endDate)}${halfDay}`,
    startDay: istDayKey(row.startDate),
    submittedAt: isoOrNull(row.createdAt),
    policyNote: joinNotes([
      Number.isFinite(lopDays) && lopDays > 0 ? "May affect LOP" : null,
      approvalRouteTargetLabel(row.approvalRoute),
    ]),
    deadlineAffected: false,
    detailHref: "/hr/leaves",
  };
}

export interface WfhQueueRow {
  id: number;
  userId: string;
  date: string | Date;
  reason?: string | null;
  createdAt?: string | Date | null;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function normaliseWfhItem(row: WfhQueueRow): ActionCenterItem {
  const day = istDayKey(row.date);
  return {
    id: `wfh:${row.id}`,
    source: "wfh",
    sourceId: row.id,
    facet: "wfh",
    type: "Work from home",
    requester: row.user
      ? {
          userId: row.user.id,
          name: null,
          firstName: row.user.firstName ?? null,
          lastName: row.user.lastName ?? null,
          email: row.user.email ?? null,
          image: row.user.image ?? null,
        }
      : null,
    requesterLabel: row.user ? getUserDisplayName(row.user) : "Unknown",
    dateRange: day ? formatDateRange(day, day) : "Date not recorded",
    startDay: day,
    submittedAt: isoOrNull(row.createdAt),
    policyNote: row.reason ?? null,
    deadlineAffected: false,
    detailHref: "/hr/attendance",
  };
}

export interface RegularizationQueueRow {
  id: number;
  userId: string;
  attendanceDate: string;
  reason?: string | null;
  createdAt?: string | null;
}

export function normaliseRegularizationItem(
  row: RegularizationQueueRow,
  directory?: ReadonlyMap<string, PersonSummary>,
): ActionCenterItem {
  const day = istDayKey(row.attendanceDate);
  const person = directory?.get(row.userId) ?? null;
  return {
    id: `attendance:${row.id}`,
    source: "attendance",
    sourceId: row.id,
    facet: "attendance",
    type: "Attendance regularization",
    requester: person,
    requesterLabel: person ? getUserDisplayName(person) : "Employee",
    dateRange: day ? formatDateRange(day, day) : "Date not recorded",
    startDay: day,
    submittedAt: isoOrNull(row.createdAt),
    policyNote: row.reason ?? null,
    deadlineAffected: false,
    detailHref: "/hr/attendance",
  };
}

export interface WorkflowQueueRow {
  id: number;
  objectType: keyof typeof HR_WORKFLOW_OBJECT_TYPE_LABELS;
  requestedBy: string;
  currentStepOrder: number;
  createdAt: string;
  dueAt?: string | null;
  requesterName?: string | null;
  requester?: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function normaliseWorkflowItem(row: WorkflowQueueRow): ActionCenterItem {
  return {
    id: `workflow:${row.id}`,
    source: "workflow",
    sourceId: row.id,
    facet: "other",
    type: HR_WORKFLOW_OBJECT_TYPE_LABELS[row.objectType],
    requester: row.requester
      ? {
          userId: row.requester.id,
          name: row.requester.name ?? null,
          firstName: row.requester.firstName ?? null,
          lastName: row.requester.lastName ?? null,
          email: row.requester.email ?? null,
          image: row.requester.image ?? null,
        }
      : null,
    requesterLabel: row.requester
      ? getUserDisplayName(row.requester)
      : (row.requesterName ?? row.requestedBy),
    dateRange: `Step ${row.currentStepOrder}`,
    startDay: null,
    submittedAt: row.createdAt,
    policyNote: null,
    deadlineAffected: false,
    detailHref: null,
  };
}

export function markDeadlineAffected(
  items: readonly ActionCenterItem[],
  cutoffDate: string | Date | null | undefined,
): ActionCenterItem[] {
  const cutoffDay = istDayKey(cutoffDate);
  if (cutoffDay === null) return items.map((item) => ({ ...item }));
  return items.map((item) => ({
    ...item,
    deadlineAffected: item.startDay !== null && item.startDay <= cutoffDay,
  }));
}
