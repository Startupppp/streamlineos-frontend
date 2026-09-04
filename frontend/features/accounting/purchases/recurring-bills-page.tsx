"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
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
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useRecurringBills,
  useRunRecurringBillNow,
  useDeleteRecurringBill,
  type RecurringBillTemplate,
  type RecurringFrequency,
} from "@/hooks/api/accounting/ap";
import { RecurringBillFormSheet } from "@/features/accounting/purchases/recurring-bill-form-sheet";
import { formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

interface RowActionsProps {
  template: RecurringBillTemplate;
  onEdit: (t: RecurringBillTemplate) => void;
}

function RecurringBillRowActions({ template, onEdit }: RowActionsProps) {
  const canManage = useCan("accounting:recurring:manage");
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

  if (!canManage) return null;

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

export function RecurringBillsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<RecurringBillTemplate | undefined>();
  const [isActiveFilter, setIsActiveFilter] = useState<"all" | "true" | "false">("all");
  const canManage = useCan("accounting:recurring:manage");

  const query = useRecurringBills({
    limit: 50,
    isActive: isActiveFilter === "all" ? undefined : isActiveFilter === "true",
  });

  const items = query.data?.data ?? [];

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

  function handleRetry(): void {
    void query.refetch();
  }

  function handleClearFilters(): void {
    setIsActiveFilter("all");
  }

  const filtersActive = isActiveFilter !== "all";

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
          className="text-micro px-1.5 py-0 h-4 bg-primary/5 text-foreground border-primary/20"
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
          {formatShortDate(row.nextRunDate) || "—"}
        </span>
      ),
    },
    {
      key: "lastRunDate",
      header: "Last run",
      cell: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatShortDate(row.lastRunDate) || "—"}
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
            className="text-micro px-1.5 py-0 h-4 bg-status-success-surface text-status-success-ink border-status-success-rule"
          >
            Active
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-micro px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border"
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
        canManage ? (
          <LoadingButton size="sm" onClick={handleNewClick} isPending={false}>
            <Plus className="size-4 mr-1" />
            New template
          </LoadingButton>
        ) : null
      }
      filters={
        <Select value={isActiveFilter} onValueChange={handleActiveFilterChange}>
          <SelectTrigger className={`w-[140px] ${FILTER_SELECT_TRIGGER}`}>
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
      <div className="flex flex-1 min-h-0 flex-col">
        {query.isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load recurring bills"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : items.length === 0 && !query.isLoading ? (
          <EmptyState
            illustrationPreset="tasks"
            title="No recurring bills"
            description={
              filtersActive
                ? undefined
                : "Create a recurring bill template to automate vendor bill creation."
            }
            filtersActive={filtersActive}
            onClearFilters={handleClearFilters}
            action={
              filtersActive || !canManage
                ? undefined
                : { label: "New template", onClick: handleNewClick }
            }
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
      </div>

      {canManage && (
        <RecurringBillFormSheet
          open={sheetOpen}
          onOpenChange={handleSheetClose}
          template={editTemplate}
        />
      )}
    </PageWrapper>
  );
}
