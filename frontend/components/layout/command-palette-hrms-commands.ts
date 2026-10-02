"use client";

import { useMemo } from "react";
import {
  CalendarPlus,
  Clock,
  ClipboardCheck,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useCan } from "@/hooks/api/access";
import type { CommandPaletteCommand } from "./command-palette-command-types";

export function useHrmsCommands(
  handleSelect: (href: string) => void,
): CommandPaletteCommand[] {
  const canRequestLeave = useCan("self:leaves");
  const canClockIn = useCan("self:attendance");
  const canApproveWorkflows = useCan("hr:workflows:approve");
  const canApproveLeaves = useCan("hr:leaves:approve");
  const canCreateEmployee = useCan("hr:employees:create");
  const canViewPayrollRuns = useCan("payroll:runs:view");

  return useMemo<CommandPaletteCommand[]>(
    () => [
      {
        id: "hrms-request-leave",
        label: "Request leave or WFH",
        group: "actions",
        keywords: ["leave", "time off", "wfh", "work from home", "request"],
        icon: CalendarPlus,
        isAvailable: canRequestLeave,
        execute: () => handleSelect("/me/time-off"),
      },
      {
        id: "hrms-clock-in",
        label: "Clock in",
        group: "actions",
        keywords: ["clock", "attendance", "check in", "punch"],
        icon: Clock,
        isAvailable: canClockIn,
        execute: () => handleSelect("/me/attendance"),
      },
      {
        id: "hrms-action-center",
        label: "Open Action Center",
        group: "actions",
        keywords: ["approvals", "action center", "queue", "pending"],
        icon: ClipboardCheck,
        isAvailable: canApproveWorkflows || canApproveLeaves,
        execute: () => handleSelect("/hr/approvals"),
      },
      {
        id: "hrms-add-employee",
        label: "Add employee",
        group: "actions",
        keywords: ["add", "employee", "hire", "onboard", "invite"],
        icon: UserPlus,
        isAvailable: canCreateEmployee,
        execute: () => handleSelect("/hr/onboarding"),
      },
      {
        id: "hrms-payroll-readiness",
        label: "Open Payroll readiness",
        group: "actions",
        keywords: ["payroll", "readiness", "cutoff", "run"],
        icon: Wallet,
        isAvailable: canViewPayrollRuns,
        execute: () => handleSelect("/payroll/readiness"),
      },
    ],
    [
      canRequestLeave,
      canClockIn,
      canApproveWorkflows,
      canApproveLeaves,
      canCreateEmployee,
      canViewPayrollRuns,
      handleSelect,
    ],
  );
}
