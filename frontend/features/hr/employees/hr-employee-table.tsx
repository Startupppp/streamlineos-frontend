"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, UserX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
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
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
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
  onPageChange,
  onPageSizeChange,
  onRequestDelete,
}: HrEmployeeTableProps) {
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
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      <CardContent className="p-0 flex flex-col flex-1 min-h-0">
        <div className="overflow-auto flex-1 min-h-0" role="region" aria-label="Employee directory table">
          <div className="min-w-[700px]">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="hover:bg-muted/40 bg-muted/40">
                  <TableHead className="font-semibold text-foreground/80">Name</TableHead>
                  <TableHead className="font-semibold text-foreground/80">Email</TableHead>
                  <TableHead className="font-semibold text-foreground/80">Role</TableHead>
                  <TableHead className="font-semibold text-foreground/80">Department</TableHead>
                  <TableHead className="font-semibold text-foreground/80">Status</TableHead>
                  <TableHead className="text-right font-semibold text-foreground/80">Actions</TableHead>
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
                    user.isActive,
                    currentUserRole,
                    currentUserId,
                  );

                  function handleTerminateClick() {
                    onRequestDelete(user);
                  }

                  return (
                    <TableRow key={user.id} className="group hover:bg-muted/50 transition-colors duration-200">
                      <TableCell>
                        <Link
                          href={`/hr/employees/${user.id}`}
                          className="flex items-center gap-3"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={resolveImageUrl(user.image)} alt="" />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200 whitespace-nowrap block truncate">
                              {displayName}
                            </span>
                          </div>
                        </Link>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {user.email}
                      </TableCell>

                      <TableCell>
                        {user.designation ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700 whitespace-nowrap">
                            {user.designation}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {user.department?.name ?? "—"}
                      </TableCell>

                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                            isActive
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              isActive ? "bg-emerald-500" : "bg-slate-400",
                            )}
                          />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rows</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-7 w-[64px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Go to</span>
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
