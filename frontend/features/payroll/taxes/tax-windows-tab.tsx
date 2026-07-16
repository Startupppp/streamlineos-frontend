"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
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
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { useTaxWindows, useUpdateTaxWindow } from "@/hooks/api/payroll/tax-windows";
import type { TaxWindow, TaxWindowStatus } from "@/types/payroll/reports";
import { TaxWindowStatusBadge } from "./tax-window-status-badge";
import { TaxWindowSheet } from "./tax-window-sheet";

const NEXT_STATUS: Partial<Record<TaxWindowStatus, { next: TaxWindowStatus; label: string; confirm: string }>> = {
  DRAFT: {
    next: "OPEN",
    label: "Open Window",
    confirm: "Employees can now submit declarations once the window is open.",
  },
  OPEN: {
    next: "CLOSED",
    label: "Close Window",
    confirm: "No new declarations will be accepted once the window is closed.",
  },
  CLOSED: {
    next: "LOCKED",
    label: "Lock",
    confirm: "The window will be locked and no further changes will be possible.",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface AdvanceTarget {
  window: TaxWindow;
  next: TaxWindowStatus;
  confirm: string;
}

export function TaxWindowsTab() {
  const { data, isLoading } = useTaxWindows();
  const updateMutation = useUpdateTaxWindow();

  const [sheetWindow, setSheetWindow] = useState<TaxWindow | null | "new">(null);
  const [advanceTarget, setAdvanceTarget] = useState<AdvanceTarget | null>(null);

  const columns: DataTableColumn<TaxWindow>[] = [
    {
      key: "financialYear",
      header: "Financial Year",
      cell: (row) => <span className="font-medium text-[11px]">{row.financialYear}</span>,
    },
    {
      key: "opensAt",
      header: "Opens At",
      cell: (row) => <span className="text-[11px]">{formatDate(row.opensAt)}</span>,
    },
    {
      key: "closesAt",
      header: "Closes At",
      cell: (row) => <span className="text-[11px]">{formatDate(row.closesAt)}</span>,
    },
    {
      key: "proofDeadline",
      header: "Proof Deadline",
      cell: (row) => <span className="text-[11px]">{formatDate(row.proofDeadline)}</span>,
    },
    {
      key: "lockDate",
      header: "Lock Date",
      cell: (row) => <span className="text-[11px]">{formatDate(row.lockDate)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <TaxWindowStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => {
        const advance = NEXT_STATUS[row.status];
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSheetWindow(row)}
            >
              Edit
            </Button>
            {advance && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() =>
                  setAdvanceTarget({ window: row, next: advance.next, confirm: advance.confirm })
                }
              >
                {advance.label}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  function handleConfirmAdvance() {
    if (!advanceTarget) return;
    updateMutation.mutate(
      { id: advanceTarget.window.id, status: advanceTarget.next },
      {
        onSuccess: () => {
          toast.success(`Window status updated to ${advanceTarget.next}`);
          setAdvanceTarget(null);
        },
        onError: () => toast.error("Failed to update status"),
      },
    );
  }

  function handleSheetClose() {
    setSheetWindow(null);
  }

  function handleAddClick() {
    setSheetWindow("new");
  }

  return (
    <>
      <DataTable
        data={data ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        minWidth="720px"
        toolbar={
          <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" size="sm" className="text-xs" onClick={handleAddClick}>
            Add Window
          </AnimatedIconButton>
        }
        emptyState={
          <EmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No declaration windows yet"
            description="Create a window to let employees submit tax declarations"
          />
        }
      />

      {sheetWindow !== null && (
        <TaxWindowSheet
          window={sheetWindow === "new" ? undefined : sheetWindow}
          onClose={handleSheetClose}
        />
      )}

      <AlertDialog
        open={advanceTarget !== null}
        onOpenChange={(open) => { if (!open) setAdvanceTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>{advanceTarget?.confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAdvance}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
