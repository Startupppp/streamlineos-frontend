"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Pencil } from "lucide-react";
import { UserXIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { TruncatedText } from "@/components/ui/truncated-text";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import {
  canDeleteEmployee,
  getDisplayName,
  getInitials,
  type Employee,
} from "./hr-types";

interface HrEmployeeTableProps {
  employees: Employee[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  showFrom: number;
  showTo: number;
  currentUserId: string | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRequestDelete: (employee: Employee) => void;
}

function EmployeeStatusChip({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
        isActive
          ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800"
          : "bg-muted text-muted-foreground border-border",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isActive ? "bg-emerald-500" : "bg-muted-foreground/50",
        )}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function TerminateButton({
  displayName,
  onClick,
}: {
  displayName: string;
  onClick: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
      aria-label={`Terminate ${displayName}`}
      title={`Terminate ${displayName}`}
      onClick={onClick}
      {...hoverHandlers}
    >
      <UserXIcon ref={iconRef} size={14} />
    </Button>
  );
}

export function HrEmployeeTable({
  employees,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRequestDelete,
  currentUserId,
}: HrEmployeeTableProps) {
  const canManageEmployees = useCan("hr:employees:update");
  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        cell: (user) => {
          const displayName = getDisplayName(user);
          const initials = getInitials(user);
          return (
            <Link
              href={`/hr/employees/${user.id}`}
              className="flex items-center gap-3"
            >
              <Avatar className="w-8 shrink-0">
                <AvatarImage src={resolveImageUrl(user.image)} alt="" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <TruncatedText
                  text={displayName}
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors duration-200"
                />
              </div>
            </Link>
          );
        },
      },
      {
        key: "email",
        header: "Email",
        headerClassName: "hidden md:table-cell",
        className: "hidden md:table-cell",
        cell: (user) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {user.email}
          </span>
        ),
      },
      {
        key: "role",
        header: "Role",
        headerClassName: "hidden sm:table-cell",
        className: "hidden sm:table-cell",
        cell: (user) =>
          user.designation ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border whitespace-nowrap">
              {user.designation}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        key: "department",
        header: "Department",
        headerClassName: "hidden lg:table-cell",
        className: "hidden lg:table-cell",
        cell: (user) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {user.department?.name ?? "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (user) => <EmployeeStatusChip isActive={user.isActive !== false} />,
      },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "text-right w-[72px]",
        className: "text-right w-[72px]",
        cell: (user) => {
          const displayName = getDisplayName(user);
          const canTerminate = canDeleteEmployee(
            user.role,
            user.id,
            user.isActive,
            currentUserId,
            canManageEmployees,
          );

          function handleTerminateClick() {
            onRequestDelete(user);
          }

          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-7"
                aria-label={`Edit ${displayName}`}
                title={`Edit ${displayName}`}
                asChild
              >
                <Link href={`/hr/employees/${user.id}?tab=profile`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </Button>
              {canTerminate && (
                <TerminateButton
                  displayName={displayName}
                  onClick={handleTerminateClick}
                />
              )}
            </div>
          );
        },
      },
    ],
    [currentUserId, canManageEmployees, onRequestDelete],
  );

  return (
    <DataTable
      data={employees}
      columns={columns}
      getRowKey={(user) => user.id}
      minWidth="700px"
      mobileCard={(user) => {
        const displayName = getDisplayName(user);
        const initials = getInitials(user);
        return (
          <Link href={`/hr/employees/${user.id}`} className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={resolveImageUrl(user.image)} alt="" />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <TruncatedText
                  text={displayName}
                  className="text-sm font-semibold text-foreground"
                />
                <EmployeeStatusChip isActive={user.isActive !== false} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[user.designation, user.department?.name].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
          </Link>
        );
      }}
      pagination={{
        mode: "server",
        page,
        pageSize,
        total: totalCount,
        onPageChange,
        onPageSizeChange,
      }}
      className="flex-1 min-h-0"
    />
  );
}
