"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { useBudgets, useCreateBudget } from "@/hooks/api/accounting/planning";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type {
  BudgetStatus,
  BudgetPeriodType,
  BudgetDimensionType,
  BudgetSummary,
} from "@/types/accounting/planning";
import { formatShortDate } from "@/lib/date-utils";
import { createBudgetSchema, type CreateBudgetForm } from "./budget-schema";

type StatusFilter = "ALL" | BudgetStatus;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "ARCHIVED", label: "Archived" },
];

const PERIOD_TYPE_OPTIONS: ReadonlyArray<{
  value: BudgetPeriodType;
  label: string;
}> = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

const DIMENSION_TYPE_OPTIONS: ReadonlyArray<{
  value: BudgetDimensionType;
  label: string;
}> = [
  { value: "NONE", label: "None" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "PROJECT", label: "Project" },
];

function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_OPTIONS.some((opt) => opt.value === value);
}

function PeriodTypeBadge({ periodType }: { periodType: BudgetPeriodType }) {
  const label =
    PERIOD_TYPE_OPTIONS.find((o) => o.value === periodType)?.label ??
    periodType;
  return (
    <Badge
      variant="outline"
      className="bg-primary/10 text-foreground border-primary/30 text-micro px-1.5 py-0 h-4"
    >
      {label}
    </Badge>
  );
}

function BudgetStatusCell({ status }: { status: BudgetStatus }) {
  if (status === "ARCHIVED") {
    return (
      <Badge
        variant="outline"
        className="bg-muted text-muted-foreground border-border text-micro px-1.5 py-0 h-4"
      >
        Archived
      </Badge>
    );
  }
  return <FinanceStatusBadge status={status} />;
}

const budgetColumns: DataTableColumn<BudgetSummary>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <span className="text-sm font-medium text-foreground hover:text-primary">
        {row.name}
      </span>
    ),
  },
  {
    key: "fiscalYear",
    header: "Fiscal Year",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">{row.fiscalYear}</span>
    ),
  },
  {
    key: "periodType",
    header: "Period",
    headerClassName: "hidden md:table-cell",
    className: "hidden md:table-cell",
    cell: (row) => <PeriodTypeBadge periodType={row.periodType} />,
  },
  {
    key: "dimensionType",
    header: "Dimension",
    headerClassName: "hidden lg:table-cell",
    className: "hidden lg:table-cell",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {row.dimensionType ?? "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <BudgetStatusCell status={row.status} />,
  },
  {
    key: "totalAmount",
    header: "Total",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => <Money value={parseFloat(row.totalAmount)} />,
  },
  {
    key: "createdAt",
    header: "Created",
    headerClassName: "hidden md:table-cell",
    className: "hidden md:table-cell",
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {formatShortDate(row.createdAt)}
      </span>
    ),
  },
];

const PAGE_SIZE = 25;

export default function BudgetsListPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [fiscalYear, setFiscalYear] = useState<string>("");
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const canCreate = useCan("accounting:budgets:create");

  const query = useBudgets({
    cursor: cursors[cursorIndex] ?? undefined,
    limit: PAGE_SIZE,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    fiscalYear: fiscalYear || undefined,
  });

  const createMutation = useCreateBudget();

  const items = query.data?.data ?? [];
  const hasMore = query.data?.pagination.hasMore ?? false;

  function handleStatusFilterChange(value: string): void {
    if (isStatusFilter(value)) {
      setStatusFilter(value);
      setCursors([null]);
      setCursorIndex(0);
    }
  }

  function handleFiscalYearChange(event: ChangeEvent<HTMLInputElement>): void {
    setFiscalYear(event.target.value);
    setCursors([null]);
    setCursorIndex(0);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  function handleRowClickRow(row: BudgetSummary): void {
    router.push(`/accounting/budgets/${row.id}`);
  }

  function handleOpenCreate(): void {
    setSheetOpen(true);
  }

  function handleCreateSheetChange(open: boolean): void {
    if (!createMutation.isPending) setSheetOpen(open);
  }

  function handleCreateSubmit(data: CreateBudgetForm): void {
    createMutation.mutate(
      {
        name: data.name,
        fiscalYear: data.fiscalYear,
        periodType: data.periodType,
        dimensionType: data.dimensionType,
      },
      {
        onSuccess: () => {
          setSheetOpen(false);
          toast.success("Budget created");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <PageWrapper
      title="Budgets"
      subtitle="Annual and departmental budgets."
      actions={
        canCreate ? (
          <AnimatedIconButton size="sm" icon={PlusIcon} iconSize={14} onClick={handleOpenCreate}>
            New Budget
          </AnimatedIconButton>
        ) : undefined
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Input
            value={fiscalYear}
            onChange={handleFiscalYearChange}
            placeholder="Fiscal year (e.g. 2025-26)"
            className="w-[200px]"
          />
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className={`w-[180px] ${FILTER_SELECT_TRIGGER}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {query.error ? (
          <ErrorState
            title="Failed to load budgets"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={items}
            columns={budgetColumns}
            getRowKey={(row) => row.id}
            isLoading={query.isLoading}
            onRowClick={handleRowClickRow}
            emptyState={
              <EmptyState
                illustration={<EmptyReportIllustration />}
                title="No budgets yet"
                description="Create a budget to start tracking planned vs actual spend."
              />
            }
            minWidth="700px"
          />
          {(cursorIndex > 0 || hasMore) ? (
            <CursorPageControls
              page={cursorIndex + 1}
              hasNext={hasMore}
              onPrevious={() => setCursorIndex(Math.max(0, cursorIndex - 1))}
              onNext={() => {
                const next = query.data?.pagination.nextCursor ?? null;
                setCursors((prev) => {
                  const copy = prev.slice(0, cursorIndex + 1);
                  copy.push(next);
                  return copy;
                });
                setCursorIndex(cursorIndex + 1);
              }}
              className="mt-2"
            />
          ) : null}
        )}
      </div>

      <EntityFormSheet<CreateBudgetForm>
        open={sheetOpen}
        onOpenChange={handleCreateSheetChange}
        title="New Budget"
        description="Create a new budget for tracking planned spend."
        resolver={zodResolver(createBudgetSchema)}
        defaultValues={{
          name: "",
          fiscalYear: "2025-26",
          periodType: "MONTHLY",
          dimensionType: "NONE",
        }}
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel="Create Budget"
        resetOnOpen
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <Input
                    {...field}
                    placeholder="e.g. FY 2025-26 Operating Budget"
                    className="text-sm"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fiscalYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal Year</FormLabel>
                  <Input
                    {...field}
                    placeholder="e.g. 2025-26"
                    className="text-sm"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="periodType"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Period Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select period type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="dimensionType"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Dimension Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select dimension" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSION_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              )}
            />
          </>
        )}
      </EntityFormSheet>
    </PageWrapper>
  );
}
