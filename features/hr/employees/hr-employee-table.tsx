"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, UserX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import {
  canDeleteEmployee,
  getDisplayName,
  getInitials,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
  type Employee,
} from "./hr-types";

interface HrEmployeeTableProps {
  employees: Employee[];
  totalCount: number;
  page: number;
  pageSize: PageSizeOption;
  totalPages: number;
  showFrom: number;
  showTo: number;
  currentUserRole: string | undefined;
  currentUserId: string | undefined;
  togglingAccess: Set<string>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
  onToggleDashboardAccess: (userId: string, newValue: boolean) => void;
  onRequestDelete: (employee: Employee) => void;
}

export function HrEmployeeTable({
  employees,
  totalCount,
  page,
  pageSize,
  totalPages,
  showFrom,
  showTo,
  currentUserRole,
  currentUserId,
  togglingAccess,
  onPageChange,
  onPageSizeChange,
  onToggleDashboardAccess,
  onRequestDelete,
}: HrEmployeeTableProps) {
  const canManageAccess = currentUserRole === "CEO" || currentUserRole === "HR";
  const [goToPage, setGoToPage] = useState("");

  const handleGoToPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGoToPage(e.target.value);
  }, []);

  const handleGoToPageKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const num = parseInt(goToPage);
        if (!isNaN(num) && num >= 1 && num <= totalPages) {
          onPageChange(num);
          setGoToPage("");
        }
      }
    },
    [goToPage, totalPages, onPageChange]
  );

  const handlePageSizeChange = useCallback(
    (v: string) => {
      onPageSizeChange(Number(v) as PageSizeOption);
    },
    [onPageSizeChange]
  );

  return (
    <Card className="border-border flex flex-col flex-1 min-h-0">
      <CardContent className="p-0 flex flex-col flex-1 min-h-0">
        <div className="overflow-auto max-h-[calc(100vh-280px)]" role="region" aria-label="Employee directory table">
          <div className="min-w-[700px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  {canManageAccess && (
                    <TableHead className="text-center">Dashboard</TableHead>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((user) => {
                  const displayName = getDisplayName(user);
                  const initials = getInitials(user);
                  const isActive = user.isActive !== false;
                  const canTerminate = canDeleteEmployee(
                    user.role,
                    user.id,
                    currentUserRole,
                    currentUserId,
                  );

                  return (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <Link
                          href={`/hr/employees/${user.id}`}
                          className="flex items-center gap-3"
                        >
                          <Avatar className="h-8 w-8 border border-border shrink-0">
                            <AvatarImage src={resolveImageUrl(user.image)} alt="" />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                            {displayName}
                          </span>
                        </Link>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {user.email}
                      </TableCell>

                      <TableCell>
                        {user.designation ? (
                          <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
                            {user.designation}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {user.department?.name ?? "—"}
                      </TableCell>

                      <TableCell>
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
                      </TableCell>

                      {canManageAccess && (
                        <TableCell className="text-center">
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
                        </TableCell>
                      )}

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={`Edit ${displayName}`}
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
                              onClick={() => onRequestDelete(user)}
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-7 w-[64px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground tabular-nums">
              {showFrom}–{showTo} of {totalCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums px-1">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
              aria-label="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-[12px] text-muted-foreground">Go to</span>
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={goToPage}
                onChange={handleGoToPageChange}
                onKeyDown={handleGoToPageKeyDown}
                placeholder="—"
                className="h-7 w-14 text-xs text-center"
                aria-label="Go to page"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
