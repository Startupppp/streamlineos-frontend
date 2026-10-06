"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  Clock,
  ClipboardCheck,
  DoorOpen,
  IndianRupee,
  Send,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useHrAttendanceStatus, useHrCheckIn, useHrCheckOut } from "@/hooks/api/hr/attendance";
import { usePayrollRuns } from "@/hooks/api/payroll/runs";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CommandPaletteCommand } from "./command-palette-command-types";

function handlePunchError(error: Error) {
  toast.error(getErrorMessage(error));
}

function handleClockedIn() {
  toast.success("Clocked in");
}

function handleClockedOut() {
  toast.success("Clocked out");
}

export function useHrmsCommands(
  handleSelect: (href: string) => void,
): CommandPaletteCommand[] {
  const canRequestLeave = useCan("self:leaves");
  const canClockIn = useCan("self:attendance");
  const canApproveWorkflows = useCan("hr:workflows:approve");
  const canApproveLeaves = useCan("hr:leaves:approve");
  const canCreateEmployee = useCan("hr:employees:create");
  const canViewPayrollRuns = useCan("payroll:runs:view");
  const canUpdateSalaries = useCan("payroll:salaries:update");
  const canPublishPayslips = useCan("payroll:payslips:manage");
  const canStartExit = useCan("hr:exit:create");
  const hrEnabled = useModuleEnabled("hr");
  const payrollEnabled = useModuleEnabled("payroll");

  const { data: attendance } = useHrAttendanceStatus({ enabled: hrEnabled });
  const checkIn = useHrCheckIn({ onSuccess: handleClockedIn, onError: handlePunchError });
  const checkOut = useHrCheckOut({ onSuccess: handleClockedOut, onError: handlePunchError });
  const { data: runsPage } = usePayrollRuns({ limit: 20 });

  const clockedIn = attendance?.status === "PRESENT" || attendance?.status === "ON_BREAK";
  const latestPaidRun = runsPage?.data.find((run) => run.status === "PAID") ?? null;
  const { mutate: mutateCheckIn } = checkIn;
  const { mutate: mutateCheckOut } = checkOut;

  const handlePunch = useCallback(() => {
    if (clockedIn) mutateCheckOut();
    else mutateCheckIn({});
  }, [clockedIn, mutateCheckIn, mutateCheckOut]);

  return useMemo<CommandPaletteCommand[]>(
    () => [
      {
        id: "hrms-request-leave",
        label: "Request leave",
        group: "actions",
        keywords: ["leave", "time off", "vacation", "holiday", "wfh", "छुट्टी", "अवकाश", "సెలవు"],
        icon: CalendarPlus,
        isAvailable: hrEnabled && (canRequestLeave),
        execute: () => handleSelect("/me/time-off?create=1"),
      },
      {
        id: "hrms-punch",
        label: clockedIn ? "Check out" : "Check in",
        group: "actions",
        keywords: clockedIn
          ? ["check out", "clock out", "punch out", "attendance", "चेक आउट", "హాజరు"]
          : ["check in", "clock in", "punch in", "attendance", "हाज़िरी", "उपस्थिति", "హాజరు"],
        icon: Clock,
        isAvailable: hrEnabled && (canClockIn && attendance !== undefined),
        confirm: true,
        execute: handlePunch,
      },
      {
        id: "hrms-action-center",
        label: "Open Action Center",
        group: "actions",
        keywords: ["approvals", "action center", "queue", "pending"],
        icon: ClipboardCheck,
        isAvailable: hrEnabled && (canApproveWorkflows || canApproveLeaves),
        execute: () => handleSelect("/hr/approvals"),
      },
      {
        id: "hrms-add-employee",
        label: "Add employee",
        group: "actions",
        keywords: ["add", "employee", "hire", "onboard", "invite"],
        icon: UserPlus,
        isAvailable: hrEnabled && (canCreateEmployee),
        execute: () => handleSelect("/hr/onboarding"),
      },
      {
        id: "hrms-add-salary",
        label: "Add salary",
        group: "actions",
        keywords: ["salary", "pay", "ctc", "compensation", "वेतन", "జీతం"],
        icon: IndianRupee,
        isAvailable: payrollEnabled && (canUpdateSalaries),
        execute: () => handleSelect("/payroll/employees"),
      },
      {
        id: "hrms-payroll-readiness",
        label: "Close payroll",
        group: "actions",
        keywords: ["payroll", "readiness", "cutoff", "run"],
        icon: Wallet,
        isAvailable: payrollEnabled && (canViewPayrollRuns),
        execute: () => handleSelect("/payroll/readiness"),
      },
      {
        id: "hrms-release-payslips",
        label: latestPaidRun ? `Release payslips · ${latestPaidRun.month}` : "Release payslips",
        group: "actions",
        keywords: ["release", "publish", "payslips", "payslip", "पेस्लिप", "పేస్లిప్"],
        icon: Send,
        isAvailable: payrollEnabled && (canPublishPayslips && latestPaidRun !== null),
        execute: () => {
          if (latestPaidRun) handleSelect(`/payroll/runs/${latestPaidRun.id}`);
        },
      },
      {
        id: "hrms-start-exit",
        label: "Start exit",
        group: "actions",
        keywords: ["exit", "resignation", "offboard", "separation", "terminate", "इस्तीफ़ा"],
        icon: DoorOpen,
        isAvailable: hrEnabled && (canStartExit),
        execute: () => handleSelect("/hr/exit"),
      },
    ],
    [
      canRequestLeave,
      canClockIn,
      canApproveWorkflows,
      canApproveLeaves,
      canCreateEmployee,
      canViewPayrollRuns,
      canUpdateSalaries,
      canPublishPayslips,
      canStartExit,
      hrEnabled,
      payrollEnabled,
      attendance,
      clockedIn,
      latestPaidRun,
      handlePunch,
      handleSelect,
    ],
  );
}
