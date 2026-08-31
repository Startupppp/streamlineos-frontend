"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, GitBranch, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger, TABS_CONTENT_PAGE_BODY_CLASS } from "@/components/ui/tabs";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { LoadingState, ErrorState } from "@/components/shared";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import { BudgetMatrix } from "@/features/accounting/planning/budget-matrix";
import { BvaTab } from "@/features/accounting/planning/bva-tab";
import { RevisionsSheet } from "@/features/accounting/planning/revisions-sheet";
import { duplicateBudgetSchema, type DuplicateBudgetForm } from "@/features/accounting/planning/duplicate-budget-schema";
import {
  useBudget,
  useSubmitBudget,
  useApproveBudget,
  useDuplicateBudget,
} from "@/hooks/api/accounting/planning";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BudgetStatus } from "@/types/accounting/planning";

function toBudgetStatus(value: string): BudgetStatus | undefined {
  if (
    value === "DRAFT" ||
    value === "PENDING_APPROVAL" ||
    value === "APPROVED" ||
    value === "ARCHIVED"
  ) return value;
  return undefined;
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

  function handleDuplicateSubmit(data: DuplicateBudgetForm): void {
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
        <div className="flex flex-1 min-h-0 flex-col">
          <LoadingState variant="page" />
        </div>
      ) : query.error ? (
        <div className="flex flex-1 min-h-0 flex-col">
          <ErrorState
            title="Failed to load budget"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        </div>
      ) : !budget ? (
        <div className="flex flex-1 min-h-0 flex-col">
          <ErrorState title="Budget not found" description={`No budget found for ID ${budgetId}.`} />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col">
          <Tabs defaultValue="matrix" className="flex flex-1 min-h-0 flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="matrix">Budget Matrix</TabsTrigger>
              <TabsTrigger value="vs-actual">vs Actual</TabsTrigger>
            </TabsList>

            <TabsContent value="matrix" className={TABS_CONTENT_PAGE_BODY_CLASS}>
              <BudgetMatrix
                budget={budget}
                readOnly={status !== "DRAFT"}
              />
            </TabsContent>

            <TabsContent value="vs-actual" className={TABS_CONTENT_PAGE_BODY_CLASS}>
              <BvaTab budgetId={budgetId} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {budget && (
        <RevisionsSheet
          budgetId={budgetId}
          open={revisionsOpen}
          onOpenChange={setRevisionsOpen}
        />
      )}

      <EntityFormSheet<DuplicateBudgetForm>
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        title="Duplicate Budget"
        description="Create a copy of this budget for a new fiscal year."
        resolver={zodResolver(duplicateBudgetSchema)}
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
                className="mt-1"
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
                className="mt-1"
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
                className="mt-1"
                placeholder="0"
              />
              <p className="text-dense text-muted-foreground mt-1">
                Apply a percentage uplift to all line amounts (e.g. 5 = +5%)
              </p>
            </div>
          </div>
        )}
      </EntityFormSheet>
    </PageWrapper>
  );
}
