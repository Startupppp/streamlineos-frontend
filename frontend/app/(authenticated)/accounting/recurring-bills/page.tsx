"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useRecurringBills,
  useRunRecurringBillNow,
  useDeleteRecurringBill,
  type RecurringBillTemplate,
  type RecurringFrequency,
} from "@/hooks/api/accounting/ap";
import { RecurringBillFormSheet } from "@/features/accounting/purchases/recurring-bill-form-sheet";

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

interface RowActionsProps {
  template: RecurringBillTemplate;
  onEdit: () => void;
}

function RecurringBillRowActions({ template, onEdit }: RowActionsProps) {
  const runNow = useRunRecurringBillNow(template.id);
  const deleteMutation = useDeleteRecurringBill(template.id);

  function handleRunNow(): void {
    runNow.mutate(undefined, {
      onSuccess: () => toast.success("Bill generated from template"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleDelete(): void {
    deleteMutation.mutate(undefined, {
      onSuccess: () => toast.success("Template deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <span className="sr-only">Actions</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            disabled={runNow.isPending}
            onSelect={handleRunNow}
            className="gap-2"
          >
            {runNow.isPending ? "Running…" : "Run now"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete template?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &ldquo;{template.name}&rdquo;. Existing bills generated
            from it are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function RecurringBillsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<RecurringBillTemplate | undefined>();
  const [isActiveFilter, setIsActiveFilter] = useState<"all" | "true" | "false">("all");

  const query = useRecurringBills({
    page: 1,
    pageSize: 50,
    isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "true",
  });

  const items = query.data?.items ?? [];

  function handleNewClick(): void {
    setEditTemplate(undefined);
    setSheetOpen(true);
  }

  function handleEditRow(t: RecurringBillTemplate): void {
    setEditTemplate(t);
    setSheetOpen(true);
  }

  function handleSheetClose(open: boolean): void {
    setSheetOpen(open);
  }

  function handleActiveFilterChange(value: string): void {
    if (value === "all" || value === "true" || value === "false") {
      setIsActiveFilter(value);
    }
  }

  const columns: DataTableColumn<RecurringBillTemplate>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (row) =>
        row.vendorId != null ? (
          <span className="text-sm text-muted-foreground">Vendor #{row.vendorId}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "frequency",
      header: "Frequency",
      cell: (row) => (
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200"
        >
          {FREQUENCY_LABELS[row.frequency]}
        </Badge>
      ),
    },
    {
      key: "nextRunDate",
      header: "Next run",
      cell: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatDate(row.nextRunDate)}
        </span>
      ),
    },
    {
      key: "lastRunDate",
      header: "Last run",
      cell: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatDate(row.lastRunDate)}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) =>
        row.isActive ? (
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            Active
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 h-4 bg-slate-100 text-slate-600 border-slate-200"
          >
            Inactive
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <RecurringBillRowActions template={row} onEdit={() => handleEditRow(row)} />
      ),
      className: "w-10",
    },
  ];

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Recurring Bills"
      subtitle="Automate vendor bill creation on a schedule."
      actions={
        <Button size="sm" onClick={handleNewClick}>
          <Plus className="size-4 mr-1" />
          New template
        </Button>
      }
      filters={
        <Select value={isActiveFilter} onValueChange={handleActiveFilterChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {items.length === 0 && !query.isLoading ? (
        <EmptyState
          illustrationPreset="tasks"
          title="No recurring bills"
          description="Create a recurring bill template to automate vendor bill creation."
          action={{ label: "New template", onClick: handleNewClick }}
        />
      ) : (
        <DataTable
          data={items}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={query.isLoading}
          pagination={{ pageSize: 50 }}
        />
      )}

      <RecurringBillFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        template={editTemplate}
      />
    </PageWrapper>
  );
}
