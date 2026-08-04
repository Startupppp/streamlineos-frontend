"use client";

import { useModuleEnabled } from "@/hooks/api/access";

export function usePayrollWorkforceLabel() {
  const hrEnabled = useModuleEnabled("hr");
  if (hrEnabled) {
    return {
      singular: "Employee",
      plural: "Employees",
      singularLower: "employee",
      pluralLower: "employees",
      profileSubtitle: "Per-employee CTC and pay configuration",
      searchPlaceholder: "Search employees…",
      emptyDescription: "Add salary profiles to include employees in payroll runs",
    } as const;
  }
  return {
    singular: "Payee",
    plural: "Payees",
    singularLower: "payee",
    pluralLower: "payees",
    profileSubtitle: "Per-payee CTC and pay configuration",
    searchPlaceholder: "Search payees…",
    emptyDescription: "Add salary profiles to include payees in payroll runs",
  } as const;
}
