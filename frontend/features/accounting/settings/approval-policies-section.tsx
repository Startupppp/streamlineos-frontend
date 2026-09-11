"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { useDeleteApprovalPolicy } from "@/hooks/api/accounting/settings";
import type { ApprovalPolicy } from "@/types/accounting/taxes";
import { PolicyDialog } from "./fin-settings-dialogs";

export interface PoliciesSectionProps {
  policies: ApprovalPolicy[];
  canManage: boolean;
}

export function PoliciesSection({ policies, canManage }: PoliciesSectionProps) {
  const [editPolicy, setEditPolicy] = useState<ApprovalPolicy | undefined>(undefined);
  const [addPolicyOpen, setAddPolicyOpen] = useState(false);
  const deletePolicy = useDeleteApprovalPolicy();

  const handleDeletePolicy = useCallback((id: number): void => {
    deletePolicy.mutate(id, {
      onSuccess: () => toast.success("Policy deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deletePolicy]);

  function handleClosePolicyDialog(v: boolean): void {
    if (!v) { setAddPolicyOpen(false); setEditPolicy(undefined); }
  }

  function handleAddPolicyOpen(): void {
    setAddPolicyOpen(true);
  }

  function getPolicyRowKey(p: ApprovalPolicy): number {
    return p.id;
  }

  const columns = useMemo<DataTableColumn<ApprovalPolicy>[]>(() => {
    const baseColumns: DataTableColumn<ApprovalPolicy>[] = [
      {
        key: "recordType",
        header: "Record type",
        cell: (row) => (
          <span className="text-xs font-mono">{row.recordType.replace(/_/g, " ")}</span>
        ),
      },
      {
        key: "minAmount",
        header: "Min amount",
        cell: (row) => <span className="text-xs tabular-nums">{row.minAmount ?? "—"}</span>,
      },
      {
        key: "approverRole",
        header: "Approver role",
        cell: (row) => <span className="text-xs">{row.approverRole ?? "—"}</span>,
      },
      {
        key: "isActive",
        header: "Active",
        cell: (row) => (
          <Badge variant={row.isActive ? "default" : "secondary"} className="text-micro">
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ];
    const actionsColumn: DataTableColumn<ApprovalPolicy> = {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditPolicy(row)}>
            Edit
          </Button>
          <LoadingButton
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-destructive hover:text-destructive"
            onClick={() => handleDeletePolicy(row.id)}
            isPending={deletePolicy.isPending}
          >
            Delete
          </LoadingButton>
        </div>
      ),
    };
    return canManage ? [...baseColumns, actionsColumn] : baseColumns;
  }, [canManage, deletePolicy.isPending, handleDeletePolicy]);

  return (
    <>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Approval Policies</CardTitle>
          {canManage && (
            <Button size="sm" className="text-xs" onClick={handleAddPolicyOpen}>Add policy</Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={policies}
            columns={columns}
            getRowKey={getPolicyRowKey}
            className="rounded-none border-0"
            emptyState={
              <p className="text-center text-xs text-muted-foreground py-6">
                No approval policies configured.
              </p>
            }
          />
        </CardContent>
      </Card>

      <PolicyDialog
        policy={editPolicy ?? null}
        open={addPolicyOpen || editPolicy !== undefined}
        onOpenChange={handleClosePolicyDialog}
      />
    </>
  );
}
