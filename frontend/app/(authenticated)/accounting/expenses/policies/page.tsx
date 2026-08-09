"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingState, ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useExpensePolicies,
  useCreateExpensePolicy,
  useUpdateExpensePolicy,
  useDeleteExpensePolicy,
} from "@/hooks/api/accounting/expenses";
import { PolicyTable } from "@/features/accounting/expenses/policy-table";
import { PolicyFormDialog } from "@/features/accounting/expenses/policy-form-dialog";
import type { FinExpensePolicy } from "@/types/accounting/expenses";

type PolicyFormValues = {
  name: string;
  maxAmount?: string;
  requiresReceiptAbove?: string;
  requiresApprovalAbove?: string;
  isActive: boolean;
};

export default function PoliciesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<FinExpensePolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<FinExpensePolicy | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const canManage = useCan("accounting:reimbursements:manage");
  const query = useExpensePolicies();
  const createMutation = useCreateExpensePolicy();
  const deleteMutation = useDeleteExpensePolicy(deletingPolicy?.id ?? 0);
  const updateMutation = useUpdateExpensePolicy(editingPolicy?.id ?? 0);

  function handleRetry(): void {
    void query.refetch();
  }

  const handleOpenCreate = useCallback(() => {
    setEditingPolicy(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((policy: FinExpensePolicy) => {
    setEditingPolicy(policy);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((policy: FinExpensePolicy) => {
    setDeletingPolicy(policy);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingPolicy) return;
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Policy deleted");
        setDeletingPolicy(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deletingPolicy, deleteMutation]);

  const handleDeleteDialogChange = useCallback(
    (open: boolean) => {
      if (!deleteMutation.isPending) setDeletingPolicy(open ? deletingPolicy : null);
    },
    [deleteMutation.isPending, deletingPolicy],
  );

  const handleToggleActive = useCallback(
    (policy: FinExpensePolicy, isActive: boolean) => {
      setTogglingId(policy.id);
      import("@/lib/api-client").then(({ apiClient }) => {
        apiClient
          .patch<{ success: boolean }>(`/accounting/expenses/policies/${policy.id}`, { isActive })
          .then(() => {
            void query.refetch();
            setTogglingId(null);
          })
          .catch((err: unknown) => {
            toast.error(getErrorMessage(err));
            setTogglingId(null);
          });
      });
    },
    [query],
  );

  const handleFormSubmit = useCallback(
    (values: PolicyFormValues, policyId: number | null) => {
      const payload = {
        name: values.name,
        maxAmount: values.maxAmount ? parseFloat(values.maxAmount) : undefined,
        requiresReceiptAbove: values.requiresReceiptAbove ? parseFloat(values.requiresReceiptAbove) : undefined,
        requiresApprovalAbove: values.requiresApprovalAbove ? parseFloat(values.requiresApprovalAbove) : undefined,
        isActive: values.isActive,
      };

      if (policyId === null) {
        createMutation.mutate(payload, {
          onSuccess: () => {
            toast.success("Policy created");
            setFormOpen(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      } else {
        updateMutation.mutate(payload, {
          onSuccess: () => {
            toast.success("Policy updated");
            setFormOpen(false);
            setEditingPolicy(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [createMutation, updateMutation],
  );

  const policies = query.data ?? [];

  return (
    <PageWrapper
      title="Expense Policies"
      subtitle="Define rules and limits for employee expense submissions."
      actions={
        canManage ? (
          <LoadingButton size="sm" onClick={handleOpenCreate}>
            <Plus className="size-4 mr-1" />
            New policy
          </LoadingButton>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {query.isLoading && <LoadingState variant="table" rows={12} />}

        {query.error && (
          <ErrorState
            title="Failed to load policies"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        )}

        {!query.isLoading && !query.error && policies.length === 0 && (
          <EmptyState
            illustration={<EmptyExpensesIllustration />}
            title="No expense policies yet"
            description="Create policies to enforce spending limits and receipt requirements."
            action={canManage ? { label: "New policy", onClick: handleOpenCreate } : undefined}
          />
        )}

        {policies.length > 0 && (
          <PolicyTable
            policies={policies}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            togglingId={togglingId}
            className="flex-1 min-h-0"
          />
        )}
      </div>

      <PolicyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        policy={editingPolicy}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deletingPolicy} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete policy: {deletingPolicy?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense policy. Existing expenses are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Keep policy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete policy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
