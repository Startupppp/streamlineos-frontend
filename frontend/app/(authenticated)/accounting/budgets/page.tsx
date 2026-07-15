"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
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

const createBudgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fiscalYear: z.string().min(1, "Fiscal year is required"),
  periodType: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  dimensionType: z.enum(["NONE", "DEPARTMENT", "PROJECT"]),
});

type CreateBudgetForm = z.infer<typeof createBudgetSchema>;

function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_OPTIONS.some((opt) => opt.value === value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function PeriodTypeBadge({ periodType }: { periodType: BudgetPeriodType }) {
  const label =
    PERIOD_TYPE_OPTIONS.find((o) => o.value === periodType)?.label ??
    periodType;
  return (
    <Badge
      variant="outline"
      className="bg-primary/10 text-foreground border-primary/30 text-[9px] px-1.5 py-0 h-4"
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
        className="bg-muted text-muted-foreground border-border text-[9px] px-1.5 py-0 h-4"
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
        {formatDate(row.createdAt)}
      </span>
    ),
  },
];

export default function BudgetsListPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [fiscalYear, setFiscalYear] = useState<string>("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const canCreate = useCan("accounting:budgets:create");

  const query = useBudgets({
    page: 1,
    pageSize: 100,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    fiscalYear: fiscalYear || undefined,
  });

  const createMutation = useCreateBudget();

  const items = query.data?.items ?? [];

  function handleStatusFilterChange(value: string): void {
    if (isStatusFilter(value)) setStatusFilter(value);
  }

  function handleFiscalYearChange(event: ChangeEvent<HTMLInputElement>): void {
    setFiscalYear(event.target.value);
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
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="size-4 mr-1" />
            New Budget
          </Button>
        ) : undefined
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={fiscalYear}
            onChange={handleFiscalYearChange}
            placeholder="Fiscal year (e.g. 2025-26)"
            className="h-8 w-[200px] text-xs"
          />
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
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
      {query.error && (
        <ErrorState
          title="Failed to load budgets"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      )}
      {!query.error && (
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
      )}

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
                    className="h-8 text-sm"
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
                    className="h-8 text-sm"
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
                    <SelectTrigger className="h-8 text-sm">
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
                    <SelectTrigger className="h-8 text-sm">
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
