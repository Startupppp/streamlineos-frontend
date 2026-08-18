import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_STRUCTURAL_ROLES } from "./user-invite-roles";

interface OrgUnitOption {
  id: string | number;
  name: string;
}

interface UserDirectoryFiltersProps {
  status: string;
  role: string;
  departmentId: string;
  branchId: string;
  departments: OrgUnitOption[];
  branches: OrgUnitOption[];
  onStatusChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onBranchChange: (value: string) => void;
}

export function UserDirectoryFilters({
  status,
  role,
  departmentId,
  branchId,
  departments,
  branches,
  onStatusChange,
  onRoleChange,
  onDepartmentChange,
  onBranchChange,
}: UserDirectoryFiltersProps) {
  const selectTriggerClass = `w-full lg:w-fit lg:min-w-32 ${FILTER_SELECT_TRIGGER}`;
  return (
    <>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      <Select value={role} onValueChange={onRoleChange}>
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All roles</SelectItem>
          {USER_STRUCTURAL_ROLES.map((structuralRole) => (
            <SelectItem key={structuralRole.value} value={structuralRole.value}>
              {structuralRole.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={departmentId} onValueChange={onDepartmentChange}>
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All departments</SelectItem>
          {departments.map((department) => (
            <SelectItem key={department.id} value={String(department.id)}>
              {department.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={branchId} onValueChange={onBranchChange}>
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="all">All branches</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={String(branch.id)}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
