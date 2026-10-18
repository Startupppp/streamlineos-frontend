import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_STRUCTURAL_ROLES } from "@/lib/constants/user-invite-roles";

interface OrgUnitOption {
  id: string | number;
  name: string;
}

type UserDirectoryFilterSlot = "all" | "primary" | "more";

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
  slot?: UserDirectoryFilterSlot;
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
  slot = "all",
}: UserDirectoryFiltersProps) {
  const selectTriggerClass = `w-full max-md:w-full md:w-auto md:min-w-[8.5rem] md:max-w-[11rem] shrink-0 ${FILTER_SELECT_TRIGGER}`;
  const menuTriggerClass = `w-full ${FILTER_SELECT_TRIGGER}`;

  const statusSelect = (
    <Select value={status} onValueChange={onStatusChange}>
      <SelectTrigger
        aria-label="Filter users by status"
        className={selectTriggerClass}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="suspended">Suspended</SelectItem>
        <SelectItem value="archived">Archived</SelectItem>
      </SelectContent>
    </Select>
  );

  const roleSelect = (
    <Select value={role} onValueChange={onRoleChange}>
      <SelectTrigger
        aria-label="Filter users by role"
        className={selectTriggerClass}
      >
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
  );

  const departmentSelect = (
    <Select value={departmentId} onValueChange={onDepartmentChange}>
      <SelectTrigger
        aria-label="Filter users by department"
        className={slot === "more" ? menuTriggerClass : selectTriggerClass}
      >
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
  );

  const branchSelect = (
    <Select value={branchId} onValueChange={onBranchChange}>
      <SelectTrigger
        aria-label="Filter users by branch"
        className={slot === "more" ? menuTriggerClass : selectTriggerClass}
      >
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
  );

  if (slot === "primary") {
    return (
      <>
        {statusSelect}
        {roleSelect}
      </>
    );
  }

  if (slot === "more") {
    return (
      <>
        {departmentSelect}
        {branchSelect}
      </>
    );
  }

  return (
    <>
      {statusSelect}
      {roleSelect}
      {departmentSelect}
      {branchSelect}
    </>
  );
}
