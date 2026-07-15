"use client";

import { useState, useMemo, useCallback, type ChangeEvent, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, GitBranch, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AppSheet } from "@/components/shared/app-sheet";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { LoadingState, ErrorState } from "@/components/shared";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import { Money } from "@/features/accounting/shared";
import { BudgetMatrix } from "@/features/accounting/planning/budget-matrix";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useBudget,
  useSubmitBudget,
  useApproveBudget,
  useBudgetRevisions,
  useDuplicateBudget,
  useBudgetVsActual,
} from "@/hooks/api/accounting/planning";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/projects/shared/resolve-user-name";
import type { BudgetStatus, BvaAccountPeriodRow } from "@/types/accounting/planning";

function toBudgetStatus(value: string): BudgetStatus | undefined {
  if (
    value === "DRAFT" ||
    value === "PENDING_APPROVAL" ||
    value === "APPROVED" ||
    value === "ARCHIVED"
  ) {
    return value;
  }
  return undefined;
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

const duplicateSchema = z.object({
  newFiscalYear: z.string().min(1, "Required"),
  newName: z.string().min(1, "Required"),
  upliftPct: z.string(),
});
type DuplicateForm = z.infer<typeof duplicateSchema>;

interface BvaFiltersProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

function BvaFilters({ from, to, onFromChange, onToChange }: BvaFiltersProps) {
  function handleFromChange(e: ChangeEvent<HTMLInputElement>): void {
    onFromChange(e.target.value);
  }
  function handleToChange(e: ChangeEvent<HTMLInputElement>): void {
    onToChange(e.target.value);
  }
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
        <Input
          type="date"
          value={from}
          onChange={handleFromChange}
          className="text-xs w-[140px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
        <Input
          type="date"
          value={to}
          onChange={handleToChange}
          className="text-xs w-[140px]"
        />
      </div>
    </div>
  );
}

const BVA_COLUMNS: DataTableColumn<BvaAccountPeriodRow>[] = [
  {
    key: "code",
    header: "Code",
    className: "font-mono text-xs px-3 py-2",
    cell: (row: BvaAccountPeriodRow): ReactNode => row.accountCode,
  },
  {
    key: "account",
    header: "Account",
    className: "text-sm px-3 py-2",
    cell: (row: BvaAccountPeriodRow): ReactNode => row.accountName,
  },
  {
    key: "period",
    header: "Period",
    className: "text-xs text-muted-foreground px-3 py-2",
    cell: (row: BvaAccountPeriodRow): ReactNode => row.periodKey,
  },
  {
    key: "budgeted",
    header: "Budgeted",
    className: "text-right px-3 py-2",
    headerClassName: "text-right",
    cell: (row: BvaAccountPeriodRow): ReactNode => (
      <Money value={parseFloat(row.budgeted)} />
    ),
  },
  {
    key: "actual",
    header: "Actual",
    className: "text-right px-3 py-2",
    headerClassName: "text-right",
    cell: (row: BvaAccountPeriodRow): ReactNode => (
      <Money value={parseFloat(row.actual)} />
    ),
  },
  {
    key: "variance",
    header: "Variance",
    className: "text-right px-3 py-2",
    headerClassName: "text-right",
    cell: (row: BvaAccountPeriodRow): ReactNode => {
      const varianceNum = parseFloat(row.variance);
      return (
        <Money value={varianceNum} className={varianceNum > 0 ? "text-red-600 dark:text-red-400" : undefined} />
      );
    },
  },
  {
    key: "status",
    header: "Status",
    className: "px-3 py-2 w-20",
    cell: (row: BvaAccountPeriodRow): ReactNode =>
      row.exceeded ? (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30 text-[9px] px-1.5 py-0 h-4">
          Over
        </Badge>
      ) : null,
  },
];

interface BvaTabProps {
  budgetId: number;
}

function BvaTab({ budgetId }: BvaTabProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = useBudgetVsActual(budgetId, {
    from: from || undefined,
    to: to || undefined,
  });

  const rows = query.data?.rows ?? [];
  const totals = query.data?.totals;

  function handleRetry(): void {
    void query.refetch();
  }

  const tableFooter = totals ? (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className="flex-1">Total</span>
      <Money value={parseFloat(totals.budgeted)} />
      <span className="w-4" />
      <Money value={parseFloat(totals.actual)} />
      <span className="w-4" />
      <Money
        value={parseFloat(totals.variance)}
        className={parseFloat(totals.variance) > 0 ? "text-red-600 dark:text-red-400" : undefined}
      />
      <span className="w-20" />
    </div>
  ) : undefined;

  return (
    <div>
      <BvaFilters
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
      />
      {query.error ? (
        <ErrorState
          title="Failed to load vs-actual data"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : rows.length === 0 && !query.isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No budget vs actual data for this range.
        </p>
      ) : (
        <DataTable
          data={rows}
          columns={BVA_COLUMNS}
          getRowKey={(row) => `${row.accountId}-${row.periodKey}`}
          isLoading={query.isLoading}
          minWidth="700px"
          footer={tableFooter}
        />
      )}
    </div>
  );
}

interface RevisionsSheetProps {
  budgetId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RevisionsSheet({ budgetId, open, onOpenChange }: RevisionsSheetProps) {
  const query = useBudgetRevisions(budgetId);
  const revisions = query.data?.items ?? [];
  const { data: membersData } = useOrgMembers(1, 200);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : userId;
    },
    [memberById],
  );

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Revision History"
      description="All saved versions of this budget."
    >
      {query.isLoading ? (
        <LoadingState variant="table" rows={12} />
      ) : revisions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No revisions yet.</p>
      ) : (
        <div className="space-y-2">
          {revisions.map((rev) => (
            <Card key={rev.id} className="border border-border rounded-lg shadow-none">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Rev #{rev.revisionNumber}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(rev.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground">By {resolveMemberName(rev.createdBy)} · {rev.lineCount} lines</p>
                {rev.note && (
                  <p className="text-xs text-foreground mt-1 italic">{rev.note}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppSheet>
  );
}

export default function BudgetDetailPage() {
  const params = useParams<{ budgetId: string }>();
  const router = useRouter();
  const budgetId = parseInt(params.budgetId, 10);

  const query = useBudget(budgetId);
  const submitMutation = useSubmitBudget(budgetId);
  const approveMutation = useApproveBudget(budgetId);
  const duplicateMutation = useDuplicateBudget(budgetId);

  const canUpdate = useCan("accounting:budgets:update");
  const canApprove = useCan("accounting:budgets:approve");

  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  const budget = query.data;
  const status = budget ? toBudgetStatus(budget.status) : undefined;

  function handleRetry(): void {
    void query.refetch();
  }

  function handleOpenRevisions(): void {
    setRevisionsOpen(true);
  }

  function handleOpenDuplicate(): void {
    setDuplicateOpen(true);
  }

  function handleSubmit(): void {
    submitMutation.mutate(
      {},
      {
        onSuccess: () => toast.success("Budget submitted for approval"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleApprove(): void {
    approveMutation.mutate(
      {},
      {
        onSuccess: () => toast.success("Budget approved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleDuplicateSubmit(data: DuplicateForm): void {
    duplicateMutation.mutate(
      {
        newFiscalYear: data.newFiscalYear,
        newName: data.newName,
        upliftPct: parseFloat(data.upliftPct) || 0,
      },
      {
        onSuccess: (created) => {
          setDuplicateOpen(false);
          toast.success("Budget duplicated");
          router.push(`/accounting/budgets/${created.id}`);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const budgetStatusBadge =
    status === "ARCHIVED" ? (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs px-2 py-0.5">
        Archived
      </Badge>
    ) : status ? (
      <FinanceStatusBadge status={status} size="chip" />
    ) : null;

  return (
    <PageWrapper
      title={budget?.name ?? "Budget"}
      subtitle={budget ? `${budget.fiscalYear} · ${budget.periodType}` : "Loading…"}
      backHref="/accounting/budgets"
      actions={
        <div className="flex items-center gap-2">
          {budgetStatusBadge}
          {status === "DRAFT" && canUpdate && (
            <LoadingButton
              size="sm"
              variant="outline"
              isPending={submitMutation.isPending}
              loadingText="Submitting…"
              onClick={handleSubmit}
            >
              <Send className="mr-1 h-4 w-4" />
              Submit
            </LoadingButton>
          )}
          {status === "PENDING_APPROVAL" && canApprove && (
            <LoadingButton
              size="sm"
              isPending={approveMutation.isPending}
              loadingText="Approving…"
              onClick={handleApprove}
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Approve
            </LoadingButton>
          )}
          <Button size="sm" variant="outline" onClick={handleOpenRevisions}>
            <GitBranch className="mr-1 h-4 w-4" />
            Revisions
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenDuplicate}>
            <Copy className="mr-1 h-4 w-4" />
            Duplicate
          </Button>
        </div>
      }
    >
      {query.isLoading ? (
        <LoadingState variant="page" />
      ) : query.error ? (
        <ErrorState
          title="Failed to load budget"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : !budget ? (
        <ErrorState title="Budget not found" description={`No budget found for ID ${budgetId}.`} />
      ) : (
        <Tabs defaultValue="matrix">
          <TabsList className="mb-4">
            <TabsTrigger value="matrix">Budget Matrix</TabsTrigger>
            <TabsTrigger value="vs-actual">vs Actual</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix">
            <BudgetMatrix
              budget={budget}
              readOnly={status !== "DRAFT"}
            />
          </TabsContent>

          <TabsContent value="vs-actual">
            <BvaTab budgetId={budgetId} />
          </TabsContent>
        </Tabs>
      )}

      {budget && (
        <RevisionsSheet
          budgetId={budgetId}
          open={revisionsOpen}
          onOpenChange={setRevisionsOpen}
        />
      )}

      <EntityFormSheet<DuplicateForm>
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        title="Duplicate Budget"
        description="Create a copy of this budget for a new fiscal year."
        resolver={zodResolver(duplicateSchema)}
        defaultValues={{
          newFiscalYear: "",
          newName: budget ? `${budget.name} (copy)` : "",
          upliftPct: "0",
        }}
        onSubmit={handleDuplicateSubmit}
        isSubmitting={duplicateMutation.isPending}
        submitLabel="Duplicate"
        resetOnOpen
      >
        {(form) => (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">New Name</Label>
              <Input
                {...form.register("newName")}
                className="mt-1 h-8 text-sm"
                placeholder="Budget name"
              />
              {form.formState.errors.newName?.message && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.newName.message}</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium">New Fiscal Year</Label>
              <Input
                {...form.register("newFiscalYear")}
                className="mt-1 h-8 text-sm"
                placeholder="2026-27"
              />
              {form.formState.errors.newFiscalYear?.message && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.newFiscalYear.message}</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium">Uplift % (optional)</Label>
              <Input
                {...form.register("upliftPct")}
                type="number"
                step="0.1"
                className="mt-1 h-8 text-sm"
                placeholder="0"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Apply a percentage uplift to all line amounts (e.g. 5 = +5%)
              </p>
            </div>
          </div>
        )}
      </EntityFormSheet>
    </PageWrapper>
  );
}
