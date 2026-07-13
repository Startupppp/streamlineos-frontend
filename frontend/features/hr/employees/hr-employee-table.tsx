"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Pencil, UserX } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
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
  currentUserRole: string | undefined;
  currentUserId: string | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRequestDelete: (employee: Employee) => void;
}

export function HrEmployeeTable({
  employees,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRequestDelete,
  currentUserRole,
  currentUserId,
}: HrEmployeeTableProps) {
  const columns = useMemo<DataTableColumn<Employee>[]>(() => [
    {
      key: "name",
      header: "Name",
      cell: (user) => {
        const displayName = getDisplayName(user);
        const initials = getInitials(user);
        return (
          <Link href={`/hr/employees/${user.id}`} className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={resolveImageUrl(user.image)} alt="" />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors duration-200 whitespace-nowrap block truncate">
                {displayName}
              </span>
            </div>
          </Link>
        );
      },
    },
    {
      key: "email",
      header: "Email",
      cell: (user) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{user.email}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
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
      cell: (user) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {user.department?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (user) => {
        const isActive = user.isActive !== false;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              isActive
                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
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
      },
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (user) => {
        const displayName = getDisplayName(user);
        const canTerminate = canDeleteEmployee(
          user.role,
          user.id,
          user.isActive,
          currentUserRole,
          currentUserId,
        );

        function handleTerminateClick() {
          onRequestDelete(user);
        }

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Edit ${displayName}`}
              title={`Edit ${displayName}`}
              asChild
            >
              <Link href={`/hr/employees/${user.id}?tab=profile`}>
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </Button>
            {canTerminate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label={`Terminate ${displayName}`}
                title={`Terminate ${displayName}`}
                onClick={handleTerminateClick}
              >
                <UserX className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [currentUserRole, currentUserId, onRequestDelete]);

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      <CardContent className="p-0 flex flex-col flex-1 min-h-0">
        <DataTable
          data={employees}
          columns={columns}
          getRowKey={(user) => user.id}
          minWidth="700px"
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: totalCount,
            onPageChange,
            onPageSizeChange,
          }}
          className="border-0 rounded-none flex-1"
        />
      </CardContent>
    </Card>
  );
}
