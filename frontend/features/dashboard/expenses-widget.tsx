"use client";

import { useCallback, useMemo, useState } from "react";
import { Receipt, Plus } from "lucide-react";
import { WidgetCard } from "@/components/ui/widget-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatINR } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useExpensePageData } from "@/hooks/api/hr";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/features/hr/expenses/expense-constants";
import { CreateExpenseDialog } from "@/features/hr/expenses/components/create-expense-dialog";
import { useDashboardAccess } from "@/features/dashboard/use-dashboard-access";
import type { ExpenseWithRelations } from "@/types/hr/expenses";

const WIDGET_PAGE_SIZE = 5;

function resolveOwnerName(user: ExpenseWithRelations["user"]): string | null {
  if (!user) return null;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.email || null;
}

function ExpenseRow({
  expense,
  showOwner,
}: {
  expense: ExpenseWithRelations;
  showOwner: boolean;
}) {
  const status = expense.status ?? "PENDING";
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  const ownerName = resolveOwnerName(expense.user);
  const subtitle = [
    showOwner && ownerName ? ownerName : null,
    expense.category,
    expense.expenseDate
      ? format(new Date(expense.expenseDate), "MMM d")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-border/60 px-2.5 py-2 hover:bg-muted/50 transition-colors">
      <span
        className={cn("h-1.5 w-1.5 rounded-full shrink-0", style?.dot)}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <TruncatedText
          text={expense.description || expense.merchant || expense.category}
          className="text-xs font-medium"
        />
        <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
      </div>
      <span className="text-xs font-semibold tabular-nums shrink-0">
        {formatINR(expense.amount)}
      </span>
      <Badge
        variant="outline"
        className={cn(
          "h-4 px-1.5 py-0 text-[9px] shrink-0",
          style?.bg,
          style?.text,
          style?.border,
        )}
      >
        {STATUS_LABELS[status] ?? status}
      </Badge>
    </li>
  );
}

export function ExpensesWidget() {
  const {
    accountingEnabled,
    canViewExpenses,
    canCreateExpenses,
    canApproveExpenses,
  } = useDashboardAccess();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const enabled = accountingEnabled && canViewExpenses;
  const { data, isLoading, error, refetch } = useExpensePageData(
    { page: 1, pageSize: WIDGET_PAGE_SIZE, sortBy: "created", sortOrder: "desc" },
    { enabled },
  );

  const isApprover = data?.isAdmin ?? canApproveExpenses;
  const expenses = useMemo(() => data?.expenses ?? [], [data]);
  const pendingCount = data?.stats?.pendingCount ?? 0;
  const pendingAmount = data?.stats?.pendingAmount ?? 0;

  const handleOpenCreate = useCallback(() => setIsCreateOpen(true), []);
  const handleCreateSuccess = useCallback(() => {
    setIsCreateOpen(false);
    void refetch();
  }, [refetch]);

  if (!enabled) return null;

  return (
    <>
      <WidgetCard
        icon={Receipt}
        iconClassName="text-primary"
        title={isApprover ? "Expense Approvals" : "My Expenses"}
        badge={pendingCount || undefined}
        link={{ href: "/hr/expenses", label: "View" }}
        isLoading={isLoading}
        error={error}
        loadingRows={3}
        isEmpty={!expenses.length}
        empty={
          <div className="flex h-full flex-col justify-between gap-2">
            <EmptyState
              illustration={<EmptyExpensesIllustration className="h-20 w-20" />}
              title="No expense claims"
              description={
                isApprover
                  ? "Claims submitted by your team will appear here."
                  : "Submit a claim to get it reimbursed."
              }
              compact
            />
            {canCreateExpenses && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleOpenCreate}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Submit expense
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-2.5">
          {pendingCount > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-2.5 py-2">
              <span className="text-[11px] text-muted-foreground">
                {isApprover ? "Awaiting your approval" : "Pending reimbursement"}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {formatINR(pendingAmount)}
              </span>
            </div>
          )}
          <ul className="space-y-2 overflow-y-auto max-h-56">
            {expenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                showOwner={isApprover}
              />
            ))}
          </ul>
          {canCreateExpenses && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleOpenCreate}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Submit expense
            </Button>
          )}
        </div>
      </WidgetCard>

      {canCreateExpenses && (
        <CreateExpenseDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={handleCreateSuccess}
          categories={EXPENSE_CATEGORIES}
          paymentMethods={PAYMENT_METHODS}
        />
      )}
    </>
  );
}
