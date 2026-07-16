"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
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
  onEdit: (t: RecurringBillTemplate) => void;
}

function RecurringBillRowActions({ template, onEdit }: RowActionsProps) {
  const runNow = useRunRecurringBillNow(template.id);
  const deleteMutation = useDeleteRecurringBill(template.id);

  function handleEdit(): void {
    onEdit(template);
  }

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

  function handlePreventClose(e: Event): void {
    e.preventDefault();
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton icon={EllipsisIcon} iconSize={14} variant="ghost" size="icon" className="w-7" aria-label="Template actions" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
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
              onSelect={handlePreventClose}
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
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.vendorId != null ? String(row.vendorId) : "—"}
        </span>
      ),
    },
    {
      key: "frequency",
      header: "Frequency",
      cell: (row) => (
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 h-4 bg-primary/5 text-foreground border-primary/20"
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
            className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
          >
            Active
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border"
          >
            Inactive
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => <RecurringBillRowActions template={row} onEdit={handleEditRow} />,
      className: "w-10",
    },
  ];

  return (
    <PageWrapper
      title="Recurring Bills"
      subtitle="Automate vendor bill creation on a schedule."
      actions={
        <LoadingButton size="sm" onClick={handleNewClick} isPending={false}>
          <Plus className="size-4 mr-1" />
          New template
        </LoadingButton>
      }
      filters={
        <Select value={isActiveFilter} onValueChange={handleActiveFilterChange}>
          <SelectTrigger className="w-[140px] text-xs">
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
          className="flex-1 min-h-0"
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
