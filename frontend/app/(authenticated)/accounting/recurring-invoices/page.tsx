"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
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
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useRecurringTemplates,
  useRunRecurringTemplate,
  useDeleteRecurringTemplate,
} from "@/hooks/api/accounting/ar";
import type { RecurringInvoiceTemplate, RecurringFrequency } from "@/types/accounting/ar";
import { RecurringTemplateFormSheet } from "@/features/accounting/sales/recurring-template-form-sheet";

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

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <span className="sr-only">Actions</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </Button>
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
  const [page, setPage] = useState(1);

  const query = useRecurringTemplates({
    isActive: activeFilter === "all" ? undefined : activeFilter === "true",
    page,
    pageSize: 20,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

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
      setPage(1);
    }
  }

  function handlePageChange(p: number): void {
    setPage(p);
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
      cell: (row) =>
        row.clientId != null ? (
          <span className="text-sm text-muted-foreground">Client #{row.clientId}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "frequency",
      header: "Frequency",
      cell: (row) => (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-primary/5 text-foreground border-primary/20">
          {FREQUENCY_LABELS[row.frequency]}
        </Badge>
      ),
    },
    {
      key: "nextRunDate",
      header: "Next run",
      cell: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">{formatDate(row.nextRunDate)}</span>
      ),
    },
    {
      key: "lastRunDate",
      header: "Last run",
      cell: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">{formatDate(row.lastRunDate)}</span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) =>
        row.isActive ? (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border">
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
      eyebrow="Accounting"
      title="Recurring Invoices"
      subtitle="Automated invoice templates on a schedule"
      actions={
        <Button size="sm" onClick={handleNewClick}>
          <Plus className="size-4 mr-1" />
          New template
        </Button>
      }
      filters={
        <Select value={activeFilter} onValueChange={handleActiveFilterChange}>
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
      {query.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {getErrorMessage(query.error)}
        </div>
      )}

      <DataTable
        data={items}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={query.isLoading}
        pagination={{
          mode: "server",
          page,
          pageSize: 20,
          total,
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

      <RecurringTemplateFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        template={editTemplate}
      />
    </PageWrapper>
  );
}
