"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, PowerOff } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
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
import { ErrorState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useReplenishmentRules,
  useDeactivateReplenishmentRule,
  type ReplenishmentRule,
} from "@/hooks/api/inventory/planning";
import { ReplenishmentRuleForm } from "./replenishment-rule-form";

interface RuleActionsProps {
  rule: ReplenishmentRule;
  onEdit: (rule: ReplenishmentRule) => void;
  onDeactivate: (rule: ReplenishmentRule) => void;
}

function RuleActions({ rule, onEdit, onDeactivate }: RuleActionsProps) {
  function handleEdit(): void {
    onEdit(rule);
  }

  function handleDeactivate(): void {
    onDeactivate(rule);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="w-7"
        onClick={handleEdit}
        aria-label="Edit rule"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      {rule.isActive && (
        <Button
          variant="ghost"
          size="icon"
          className="w-7 text-destructive hover:text-destructive"
          onClick={handleDeactivate}
          aria-label="Deactivate rule"
        >
          <PowerOff className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function buildColumns(
  onEdit: (rule: ReplenishmentRule) => void,
  onDeactivate: (rule: ReplenishmentRule) => void,
): DataTableColumn<ReplenishmentRule>[] {
  return [
    {
      key: "product",
      header: "Product / SKU",
      cell: (rule) => (
        <div>
          <TruncatedText text={rule.productName} className="text-sm font-medium text-foreground" />
          <p className="text-xs text-muted-foreground font-mono">{rule.variantSku}</p>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      className: "text-muted-foreground",
      cell: (rule) => <TruncatedText text={rule.warehouseName} className="text-sm text-muted-foreground" />,
    },
    {
      key: "minQty",
      header: "Min",
      className: "tabular-nums",
      cell: (rule) => rule.minQty,
    },
    {
      key: "maxQty",
      header: "Max",
      className: "tabular-nums",
      cell: (rule) => rule.maxQty,
    },
    {
      key: "reorderQty",
      header: "Reorder Qty",
      className: "tabular-nums",
      cell: (rule) => rule.reorderQty,
    },
    {
      key: "safetyStock",
      header: "Safety Stock",
      className: "tabular-nums",
      cell: (rule) => rule.safetyStock ?? "—",
    },
    {
      key: "leadTimeDays",
      header: "Lead Time",
      className: "tabular-nums",
      cell: (rule) => rule.leadTimeDays != null ? `${rule.leadTimeDays}d` : "—",
    },
    {
      key: "vendor",
      header: "Vendor",
      className: "text-muted-foreground",
      cell: (rule) => <TruncatedText text={rule.vendorName ?? "—"} className="text-sm text-muted-foreground" />,
    },
    {
      key: "status",
      header: "Status",
      cell: (rule) => (
        <Badge variant={rule.isActive ? "default" : "secondary"} className="text-[11px]">
          {rule.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (rule) => (
        <RuleActions rule={rule} onEdit={onEdit} onDeactivate={onDeactivate} />
      ),
    },
  ];
}

export function ReplenishmentRulesClient() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useReplenishmentRules({ page });
  const deactivate = useDeactivateReplenishmentRule();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRule, setEditRule] = useState<ReplenishmentRule | undefined>(undefined);
  const [deactivateTarget, setDeactivateTarget] = useState<ReplenishmentRule | undefined>(undefined);

  const { iconRef: addRef, hoverHandlers: addHandlers } = useAnimatedIcon();

  const rules = data?.items ?? [];
  const total = data?.total ?? 0;

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
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }

  function handleDeactivateCancel(): void {
    setDeactivateTarget(undefined);
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleAlertOpenChange(open: boolean): void {
    if (!open) handleDeactivateCancel();
  }

  const columns = buildColumns(handleEditRule, handleDeactivatePrompt);

  return (
    <PageWrapper
      title="Replenishment Rules"
      backHref="/inventory/replenishment"
      actions={
        <Button size="sm" onClick={handleAddRule} {...addHandlers}>
          <PlusIcon ref={addRef} size={14} />
          Add Rule
        </Button>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {error ? (
          <ErrorState onRetry={handleRetry} />
        ) : !isLoading && rules.length === 0 ? (
          <InventoryEmptyState
            illustrationPreset="inventory"
            title="No replenishment rules"
            description="Add rules to automate stock replenishment suggestions."
            action={{ label: "Add Rule", onClick: handleAddRule }}
            className="flex-1 h-full"
          />
        ) : (
          <DataTable
            data={rules}
            columns={columns}
            className="flex-1 min-h-0"
            getRowKey={(rule) => rule.id}
            isLoading={isLoading}
            pagination={{ mode: "server", page, pageSize: 50, total, onPageChange: setPage }}
            minWidth="900px"
          />
        )}
      </div>

      <ReplenishmentRuleForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editRule={editRule}
      />

      <AlertDialog open={!!deactivateTarget} onOpenChange={handleAlertOpenChange}>
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
