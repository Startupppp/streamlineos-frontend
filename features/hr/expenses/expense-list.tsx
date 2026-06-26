"use client";

import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { AdminExpenseItem } from "./expense-item";
import { MemberExpenseItem } from "./expense-item";
import type { ExpenseWithRelations } from "@/server/actions/expense-query";
import type { ExpenseToEdit } from "@/app/(dashboard)/hr/expenses/create-expense-dialog";
import type { StatusFilter } from "./expense-constants";

interface PaginationProps {
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  startItem: number;
  endItem: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  variant?: "admin" | "member";
}

function ExpensePagination({
  pagination,
  startItem,
  endItem,
  totalPages,
  onPageChange,
  variant = "member",
}: PaginationProps) {
  if (pagination.total === 0 || totalPages <= 1) return null;

  if (variant === "admin") {
    return (
      <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20">
        <span className="text-xs text-muted-foreground">
          Showing{" "}
          <strong className="font-semibold text-foreground">{startItem}</strong>{" "}
          to{" "}
          <strong className="font-semibold text-foreground">{endItem}</strong>{" "}
          of{" "}
          <strong className="font-semibold text-foreground">{pagination.total}</strong>{" "}
          results
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          {(() => {
            const maxVisible = 5;
            let start = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
            const end = Math.min(totalPages, start + maxVisible - 1);
            start = Math.max(1, end - maxVisible + 1);
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
          })().map((p) => (
            <Button
              key={p}
              variant={p === pagination.page ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={pagination.page >= totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20">
      <span className="text-xs text-muted-foreground">
        Showing{" "}
        <strong className="font-semibold text-foreground">{startItem}</strong>{" "}
        to{" "}
        <strong className="font-semibold text-foreground">{endItem}</strong>{" "}
        of{" "}
        <strong className="font-semibold text-foreground">{pagination.total}</strong>{" "}
        claims
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground px-1">
          {pagination.page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={pagination.page >= totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface AdminExpenseListProps {
  expenses: ExpenseWithRelations[];
  currentUserId?: string;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  startItem: number;
  endItem: number;
  totalPages: number;
  statusFilter: StatusFilter;
  rejectingId: number | null;
  rejectionReason: string;
  isPending: boolean;
  onApprove: (id: number) => void;
  onRejectStart: (id: number) => void;
  onRejectConfirm: (id: number) => void;
  onRejectCancel: () => void;
  onRejectionReasonChange: (reason: string) => void;
  onPageChange: (page: number) => void;
  onShowAll: () => void;
}

export function AdminExpenseList({
  expenses,
  currentUserId,
  pagination,
  startItem,
  endItem,
  totalPages,
  statusFilter,
  rejectingId,
  rejectionReason,
  isPending,
  onApprove,
  onRejectStart,
  onRejectConfirm,
  onRejectCancel,
  onRejectionReasonChange,
  onPageChange,
  onShowAll,
}: AdminExpenseListProps) {
  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <h3 className="text-sm font-semibold text-foreground">Expense Claims</h3>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {startItem}–{endItem} of {pagination.total}{" "}
            {statusFilter === "PENDING" ? "pending" : "total"}
          </span>
        </div>

        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <EmptyExpensesIllustration className="h-5 w-5 opacity-60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No expenses found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {statusFilter !== "ALL" ? "Try adjusting your filters" : "No expense claims to review"}
              </p>
            </div>
            {statusFilter !== "ALL" && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 mt-1" onClick={onShowAll}>
                Show All Claims
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {expenses.map((expense) => (
              <AdminExpenseItem
                key={expense.id}
                expense={expense}
                currentUserId={currentUserId}
                rejectingId={rejectingId}
                rejectionReason={rejectionReason}
                isPending={isPending}
                onApprove={onApprove}
                onRejectStart={onRejectStart}
                onRejectConfirm={onRejectConfirm}
                onRejectCancel={onRejectCancel}
                onRejectionReasonChange={onRejectionReasonChange}
              />
            ))}
          </div>
        )}

        <ExpensePagination
          pagination={pagination}
          startItem={startItem}
          endItem={endItem}
          totalPages={totalPages}
          onPageChange={onPageChange}
          variant="admin"
        />
      </CardContent>
    </Card>
  );
}

interface MemberExpenseListProps {
  expenses: ExpenseWithRelations[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  startItem: number;
  endItem: number;
  totalPages: number;
  statusFilter: StatusFilter;
  activeFilterCount: number;
  onEdit: (expense: ExpenseToEdit) => void;
  onResubmit: (expense: ExpenseWithRelations) => void;
  onShowAll: () => void;
  onCreateNew: () => void;
  onPageChange: (page: number) => void;
}

export function MemberExpenseList({
  expenses,
  pagination,
  startItem,
  endItem,
  totalPages,
  statusFilter,
  activeFilterCount,
  onEdit,
  onResubmit,
  onShowAll,
  onCreateNew,
  onPageChange,
}: MemberExpenseListProps) {
  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardContent className="p-0" aria-live="polite">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <EmptyExpensesIllustration className="h-5 w-5 opacity-60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No expenses found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {statusFilter !== "ALL" || activeFilterCount > 0
                  ? "Try adjusting your filters"
                  : "Submit your first expense claim to get started"}
              </p>
            </div>
            {statusFilter !== "ALL" ? (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 mt-1" onClick={onShowAll}>
                Show All Claims
              </Button>
            ) : (
              <Button size="sm" className="h-8 text-xs gap-1.5 mt-1" onClick={onCreateNew}>
                <Plus className="h-3.5 w-3.5" />
                Submit New Claim
              </Button>
            )}
          </div>
        ) : (
          <>
            <ScrollArea className="w-full max-h-[60vh]" type="auto" role="region" aria-label="Expense claims table">
              <div className="min-w-[640px]">
                <Table>
                  <caption className="sr-only">Expense claims</caption>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead scope="col" className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wider px-6 py-3">Claim ID</TableHead>
                      <TableHead scope="col" className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wider px-6 py-3">Date</TableHead>
                      <TableHead scope="col" className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wider px-6 py-3">Category</TableHead>
                      <TableHead scope="col" className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wider px-6 py-3">Description</TableHead>
                      <TableHead scope="col" className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wider px-6 py-3">Amount</TableHead>
                      <TableHead scope="col" className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wider px-6 py-3">Status</TableHead>
                      <TableHead scope="col" className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wider px-6 py-3 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <MemberExpenseItem
                        key={expense.id}
                        expense={expense}
                        onEdit={onEdit}
                        onResubmit={onResubmit}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>

            <ExpensePagination
              pagination={pagination}
              startItem={startItem}
              endItem={endItem}
              totalPages={totalPages}
              onPageChange={onPageChange}
              variant="member"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
