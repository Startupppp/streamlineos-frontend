"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
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
  totalPages: number;
  showFrom: number;
  showTo: number;
  currentUserRole: string | undefined;
  currentUserId: string | undefined;
  togglingAccess: Set<string>;
  onPageChange: (page: number) => void;
  onToggleDashboardAccess: (userId: string, newValue: boolean) => void;
  onRequestDelete: (employee: Employee) => void;
}

export function HrEmployeeTable({
  employees,
  totalCount,
  page,
  totalPages,
  showFrom,
  showTo,
  currentUserRole,
  currentUserId,
  togglingAccess,
  onPageChange,
  onToggleDashboardAccess,
  onRequestDelete,
}: HrEmployeeTableProps) {
  const canManageAccess =
    currentUserRole === "CEO" || currentUserRole === "HR";

  return (
    <Card className="border-border">
      <CardContent className="p-0">
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Employee directory table"
          tabIndex={0}
        >
          <table className="w-full">
            <caption className="sr-only">Employee directory table</caption>
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="text-left text-xs font-medium text-muted-foreground py-3 px-4"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="text-left text-xs font-medium text-muted-foreground py-3 px-4"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="text-left text-xs font-medium text-muted-foreground py-3 px-4"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="text-left text-xs font-medium text-muted-foreground py-3 px-4"
                >
                  Department
                </th>
                <th
                  scope="col"
                  className="text-left text-xs font-medium text-muted-foreground py-3 px-4"
                >
                  Status
                </th>
                {canManageAccess && (
                  <th
                    scope="col"
                    className="text-center text-xs font-medium text-muted-foreground py-3 px-4"
                  >
                    Dashboard
                  </th>
                )}
                <th
                  scope="col"
                  className="text-right text-xs font-medium text-muted-foreground py-3 px-4"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((user) => {
                const displayName = getDisplayName(user);
                const initials = getInitials(user);
                const isActive = user.isActive !== false;

                return (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group"
                  >
                    {/* Name */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/hr/employees/${user.id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarImage
                            src={resolveImageUrl(user.image)}
                            alt=""
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {displayName}
                        </span>
                      </Link>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {user.email}
                    </td>

                    {/* Designation / Role */}
                    <td className="py-3 px-4">
                      {user.designation ? (
                        <Badge variant="outline" className="text-xs font-normal">
                          {user.designation}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {user.department?.name ?? "—"}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-xs gap-1.5 ${
                          isActive
                            ? "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-500/10"
                            : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-500/10"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>

                    {/* Dashboard Access Toggle */}
                    {canManageAccess && (
                      <td className="py-3 px-4 text-center">
                        {user.role === "CEO" || user.id === currentUserId ? (
                          <Switch
                            checked={true}
                            disabled
                            aria-label="Dashboard access always on"
                          />
                        ) : (
                          <Switch
                            checked={user.hasDashboardAccess}
                            disabled={togglingAccess.has(user.id)}
                            onCheckedChange={(checked) =>
                              onToggleDashboardAccess(user.id, checked)
                            }
                            aria-label={`Toggle dashboard access for ${displayName}`}
                          />
                        )}
                      </td>
                    )}

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={`Actions for ${displayName}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/hr/employees/${user.id}?tab=profile`}
                            >
                              <Pencil
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                              Edit Profile
                            </Link>
                          </DropdownMenuItem>
                          {canDeleteEmployee(
                            user.role,
                            user.id,
                            currentUserRole,
                            currentUserId,
                          ) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onRequestDelete(user)}
                              >
                                <Trash2
                                  className="mr-2 h-4 w-4"
                                  aria-hidden="true"
                                />
                                Deactivate
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-border">
          <p className="text-xs sm:text-sm text-gold font-medium">
            Showing {showFrom}–{showTo} of {totalCount} employees
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-8 text-xs"
              aria-label="Go to previous page"
            >
              Previous
            </Button>
            <span
              className="text-xs text-muted-foreground whitespace-nowrap"
              aria-current="page"
            >
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="h-8 text-xs"
              aria-label="Go to next page"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
