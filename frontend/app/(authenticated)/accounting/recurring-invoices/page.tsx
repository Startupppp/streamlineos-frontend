"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
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
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useRecurringTemplates,
  useRunRecurringTemplate,
  useDeleteRecurringTemplate,
} from "@/hooks/api/accounting/ar";
import type { RecurringInvoiceTemplate, RecurringFrequency } from "@/types/accounting/ar";
import { RecurringTemplateFormSheet } from "@/features/accounting/sales/recurring-template-form-sheet";
import { formatShortDate } from "@/lib/date-utils";

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

interface RowActionsProps {
  template: RecurringInvoiceTemplate;
  onEdit: (template: RecurringInvoiceTemplate) => void;
}

function TemplateRowActions({ template, onEdit }: RowActionsProps) {
  const runMutation = useRunRecurringTemplate();
  const deleteMutation = useDeleteRecurringTemplate();

  function handleEdit(): void {
    onEdit(template);
  }

  function handleRunNow(): void {
    runMutation.mutate(
      { templateId: template.id },
      {
        onSuccess: () => toast.success("Invoice generated from template"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleDelete(): void {
    deleteMutation.mutate(
      { templateId: template.id },
      {
        onSuccess: () => toast.success("Template deleted"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
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
            disabled={runMutation.isPending}
            onSelect={handleRunNow}
          >
            {runMutation.isPending ? "Running…" : "Run now"}
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
            This will permanently delete &ldquo;{template.name}&rdquo;. Already generated invoices
            are not affected.
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

export default function RecurringInvoicesPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<RecurringInvoiceTemplate | undefined>();
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);

  const query = useRecurringTemplates({
    isActive: activeFilter === "all" ? undefined : activeFilter === "true",
    cursor: cursors[cursorIndex] ?? undefined,
    limit: 20,
  });

  const items = query.data?.data ?? [];
  const hasMore = query.data?.pagination.hasMore ?? false;
  const currentPage = cursorIndex + 1;
  const syntheticTotal = hasMore
    ? currentPage * 20 + 1
    : (currentPage - 1) * 20 + items.length;

  function handleNewClick(): void {
    setEditTemplate(undefined);
    setSheetOpen(true);
  }

  function handleEditRow(t: RecurringInvoiceTemplate): void {
    setEditTemplate(t);
    setSheetOpen(true);
  }

  function handleSheetOpenChange(open: boolean): void {
    setSheetOpen(open);
  }

  function handleActiveFilterChange(value: string): void {
    if (value === "all" || value === "true" || value === "false") {
      setActiveFilter(value);
      setCursors([null]);
      setCursorIndex(0);
    }
  }

  function handlePageChange(newPage: number): void {
    if (newPage > currentPage && hasMore) {
      const next = query.data?.pagination.nextCursor ?? null;
      setCursors((prev) => {
        const copy = prev.slice(0, cursorIndex + 1);
        copy.push(next);
        return copy;
      });
      setCursorIndex(cursorIndex + 1);
    } else if (newPage < currentPage) {
      setCursorIndex(Math.max(0, cursorIndex - 1));
    }
  }

  const columns: DataTableColumn<RecurringInvoiceTemplate>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
    },
    {
      key: "clientId",
      header: "Customer",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.clientId != null ? "—" : "—"}
        </span>
      ),
    },
    {
      key: "frequency",
      header: "Frequency",
      cell: (row) => (
        <Badge variant="outline" className="text-micro px-1.5 py-0 h-4 bg-primary/5 text-foreground border-primary/20">
          {FREQUENCY_LABELS[row.frequency]}
        </Badge>
      ),
    },
    {
      key: "nextRunDate",
      header: "Next run",
      cell: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">{formatShortDate(row.nextRunDate) || "—"}</span>
      ),
    },
    {
      key: "lastRunDate",
      header: "Last run",
      cell: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">{formatShortDate(row.lastRunDate) || "—"}</span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) =>
        row.isActive ? (
          <Badge variant="outline" className="text-micro px-1.5 py-0 h-4 bg-status-success-surface text-status-success-ink border-status-success-rule">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-micro px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border">
            Inactive
          </Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) => <TemplateRowActions template={row} onEdit={handleEditRow} />,
    },
  ];

  return (
    <PageWrapper
      title="Recurring Invoices"
      subtitle="Automated invoice templates on a schedule"
      actions={
        <LoadingButton size="sm" onClick={handleNewClick} isPending={false}>
          <Plus className="size-4 mr-1" />
          New template
        </LoadingButton>
      }
      filters={
        <Select value={activeFilter} onValueChange={handleActiveFilterChange}>
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
            title="Failed to load recurring invoices"
            description={getErrorMessage(query.error)}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={items}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={query.isLoading}
            pagination={{
              mode: "server",
              page: currentPage,
              pageSize: 20,
              total: syntheticTotal,
              onPageChange: handlePageChange,
            }}
            emptyState={
              <EmptyState
                illustrationPreset="automations"
                title="No recurring invoice templates"
                description="Create templates to auto-generate invoices on a schedule."
                action={{ label: "New template", onClick: handleNewClick }}
              />
            }
          />
        )}
      </div>

      <RecurringTemplateFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        template={editTemplate}
      />
    </PageWrapper>
  );
}
