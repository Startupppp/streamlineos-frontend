"use client";

import { useMemo } from "react";
import { usePermissionGate } from "@/hooks/api/access";
import { useHrLeaveApprovals } from "@/hooks/api/hr";
import { useHrPendingWfhRequests } from "@/hooks/api/hr/hr-settings";
import { useHrRegularizationQueue } from "@/hooks/api/hr/attendance-regularization-queue";
import { useHrEmployeeOptions } from "@/hooks/api/hr/employee-list";
import { useWorkflowInbox } from "@/hooks/api/hr/hr-workflows";
import { usePayrollCutoff } from "@/hooks/api/payroll/payroll-cutoff";
import type { PayrollCutoff } from "@/lib/hrms/payroll-cutoff";
import type { PersonSummary } from "@/components/shared/person-drawer";
import {
  markDeadlineAffected,
  normaliseLeaveItem,
  normaliseRegularizationItem,
  normaliseWfhItem,
  normaliseWorkflowItem,
} from "@/features/hr/action-center/normalise-queue";
import {
  sortQueueItems,
  type ActionCenterItem,
  type ActionCenterSource,
} from "@/features/hr/action-center/queue-item";

export interface QueueSourceState {
  readonly key: ActionCenterSource;
  readonly label: string;
  readonly permission: string;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly denied: boolean;
  readonly retry: () => void;
}

export interface ActionCenterQueue {
  readonly items: ActionCenterItem[];
  readonly sources: QueueSourceState[];
  readonly isLoading: boolean;
  readonly settledAcrossEverySource: boolean;
  readonly cutoff: PayrollCutoff | null;
  readonly cutoffLoading: boolean;
}

export function useActionCenterQueue(): ActionCenterQueue {
  const leaveGate = usePermissionGate("hr:leaves:view");
  const wfhGate = usePermissionGate("hr:attendance:manage");
  const attendanceGate = usePermissionGate("hr:attendance:view");

  const leaves = useHrLeaveApprovals({ status: "PENDING", limit: 50 });
  const wfh = useHrPendingWfhRequests();
  const regularizations = useHrRegularizationQueue({
    status: "PENDING",
    limit: 50,
  });
  const inbox = useWorkflowInbox();
  const { cutoff, isLoading: cutoffLoading } = usePayrollCutoff();
  const directoryLookup = useHrEmployeeOptions({ limit: 100 });

  const directory = useMemo(() => {
    const byUserId = new Map<string, PersonSummary>();
    for (const employee of directoryLookup.employees) {
      byUserId.set(employee.id, {
        userId: employee.id,
        name: employee.name,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        image: employee.image,
        employeeId: employee.employeeId,
        designation: employee.designation,
        departmentName: employee.department?.name ?? null,
        isActive: employee.isActive,
      });
    }
    return byUserId;
  }, [directoryLookup.employees]);

  const leaveRows = useMemo(
    () => (leaves.data?.pages ?? []).flatMap((page) => page.data),
    [leaves.data],
  );

  const items = useMemo(() => {
    const merged: ActionCenterItem[] = [
      ...leaveRows.map(normaliseLeaveItem),
      ...(wfh.data ?? []).map(normaliseWfhItem),
      ...(regularizations.data?.data ?? []).map((row) => normaliseRegularizationItem(row, directory)),
      ...(inbox.data?.data ?? []).map(normaliseWorkflowItem),
    ];
    return sortQueueItems(markDeadlineAffected(merged, cutoff?.date ?? null));
  }, [leaveRows, wfh.data, regularizations.data, inbox.data, cutoff, directory]);

  const sources = useMemo<QueueSourceState[]>(
    () => [
      {
        key: "leave",
        label: "Leave",
        permission: "hr:leaves:view",
        isLoading: leaves.isLoading || leaveGate.pending,
        isError: leaves.isError,
        denied: leaveGate.denied,
        retry: () => void leaves.refetch(),
      },
      {
        key: "wfh",
        label: "Work from home",
        permission: "hr:attendance:manage",
        isLoading: wfh.isLoading || wfhGate.pending,
        isError: wfh.isError,
        denied: wfhGate.denied,
        retry: () => void wfh.refetch(),
      },
      {
        key: "attendance",
        label: "Attendance regularizations",
        permission: "hr:attendance:view",
        isLoading: regularizations.isLoading || attendanceGate.pending,
        isError: regularizations.isError,
        denied: attendanceGate.denied,
        retry: () => void regularizations.refetch(),
      },
      {
        key: "workflow",
        label: "Other requests",
        permission: "hr:workflows:approve",
        isLoading: inbox.isLoading || inbox.access.pending,
        isError: inbox.isError,
        denied: inbox.access.denied,
        retry: () => void inbox.refetch(),
      },
    ],
    [leaves, wfh, regularizations, inbox, leaveGate, wfhGate, attendanceGate],
  );

  const isLoading = sources.some((source) => source.isLoading);
  const settledAcrossEverySource = sources.every(
    (source) => !source.isLoading && !source.isError && !source.denied,
  );

  return {
    items,
    sources,
    isLoading,
    settledAcrossEverySource,
    cutoff,
    cutoffLoading,
  };
}
