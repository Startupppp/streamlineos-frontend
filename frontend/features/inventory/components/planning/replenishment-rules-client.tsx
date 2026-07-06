"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, PowerOff } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
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
import { SkeletonTable, ErrorState, DataTablePagination } from "@/components/shared";
import {
  useReplenishmentRules,
  useDeactivateReplenishmentRule,
  type ReplenishmentRule,
} from "@/hooks/api/inventory/planning";
import { ReplenishmentRuleForm } from "./replenishment-rule-form";

interface RuleRowProps {
  rule: ReplenishmentRule;
  onEdit: (rule: ReplenishmentRule) => void;
  onDeactivate: (rule: ReplenishmentRule) => void;
}

function RuleRow({ rule, onEdit, onDeactivate }: RuleRowProps) {
  function handleEdit(): void {
    onEdit(rule);
  }

  function handleDeactivate(): void {
    onDeactivate(rule);
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{rule.productName}</p>
        <p className="text-xs text-muted-foreground font-mono">{rule.variantSku}</p>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{rule.warehouseName}</td>
      <td className="px-4 py-3 text-sm tabular-nums">{rule.minQty}</td>
      <td className="px-4 py-3 text-sm tabular-nums">{rule.maxQty}</td>
      <td className="px-4 py-3 text-sm tabular-nums">{rule.reorderQty}</td>
      <td className="px-4 py-3 text-sm tabular-nums">{rule.safetyStock ?? "—"}</td>
      <td className="px-4 py-3 text-sm tabular-nums">
        {rule.leadTimeDays != null ? `${rule.leadTimeDays}d` : "—"}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{rule.vendorName ?? "—"}</td>
      <td className="px-4 py-3">
        <Badge variant={rule.isActive ? "default" : "secondary"} className="text-[11px]">
          {rule.isActive ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Edit rule">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {rule.isActive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDeactivate}
              aria-label="Deactivate rule"
            >
              <PowerOff className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function ReplenishmentRulesClient() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useReplenishmentRules({ page });
  const deactivate = useDeactivateReplenishmentRule();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRule, setEditRule] = useState<ReplenishmentRule | undefined>(undefined);
  const [deactivateTarget, setDeactivateTarget] = useState<ReplenishmentRule | undefined>(undefined);

  const rules = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function handleAddRule(): void {
    setEditRule(undefined);
    setSheetOpen(true);
  }

  function handleEditRule(rule: ReplenishmentRule): void {
    setEditRule(rule);
    setSheetOpen(true);
  }

  function handleDeactivatePrompt(rule: ReplenishmentRule): void {
    setDeactivateTarget(rule);
  }

  function handleDeactivateConfirm(): void {
    if (!deactivateTarget) return;
    deactivate.mutate(deactivateTarget.id, {
      onSuccess: () => {
        toast.success("Rule deactivated");
        setDeactivateTarget(undefined);
      },
      onError: () => {
        toast.error("Failed to deactivate rule");
      },
    });
  }

  function handleDeactivateCancel(): void {
    setDeactivateTarget(undefined);
  }

  function handleRetry(): void {
    void refetch();
  }

  return (
    <PageWrapper
      title="Replenishment Rules"
      backHref="/inventory/replenishment"
      actions={
        <Button size="sm" onClick={handleAddRule}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Rule
        </Button>
      }
    >
      {isLoading ? (
        <SkeletonTable rows={6} columns={10} />
      ) : error ? (
        <ErrorState onRetry={handleRetry} />
      ) : rules.length === 0 ? (
        <InventoryEmptyState
          illustrationPreset="inventory"
          title="No replenishment rules"
          description="Add rules to automate stock replenishment suggestions."
          action={{ label: "Add Rule", onClick: handleAddRule }}
          className="flex-1 h-full"
        />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Product / SKU</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Warehouse</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Min</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Max</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Reorder Qty</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Safety Stock</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Lead Time</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Vendor</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      onEdit={handleEditRule}
                      onDeactivate={handleDeactivatePrompt}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={20}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <ReplenishmentRuleForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editRule={editRule}
      />

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && handleDeactivateCancel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the replenishment rule for{" "}
              <strong>{deactivateTarget?.productName}</strong> in{" "}
              <strong>{deactivateTarget?.warehouseName}</strong>. It can be re-activated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeactivateCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateConfirm}
              disabled={deactivate.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
