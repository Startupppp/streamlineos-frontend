import type React from "react";

export interface WorkLogFilters {
  year: number;
  quarter: number;
  selectedUserId?: string;
  departmentId?: string;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface WorkLogFilterEmployee {
  id: string;
  firstName: string | null;
  lastName: string | null;
  departmentId?: number | null;
  joiningDate?: string | Date | null;
}

export interface WorkLogFilterDepartment {
  id: number;
  name: string;
}

export interface SharedFilterProps {
  filters: WorkLogFilters;
  setFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  draftFilters: WorkLogFilters;
  setDraftFilters: React.Dispatch<React.SetStateAction<WorkLogFilters>>;
  activeFilterCount: number;
  availableYears: number[];
  currentYear: number;
  currentQuarter: number;
  employees: WorkLogFilterEmployee[] | undefined;
  departments: WorkLogFilterDepartment[] | undefined;
  canManageEmployees: boolean;
}
