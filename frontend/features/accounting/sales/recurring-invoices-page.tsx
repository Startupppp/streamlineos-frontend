"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useCursorPageStack } from "@/hooks/common/use-cursor-page-stack";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRecurringTemplates } from "@/hooks/api/accounting/ar";
import type { RecurringInvoiceTemplate, RecurringFrequency } from "@/types/accounting/ar";
import { RecurringTemplateFormSheet } from "@/features/accounting/sales/recurring-template-form-sheet";
import { TemplateRowActions } from "@/features/accounting/sales/recurring-template-row-actions";
import { formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export function RecurringInvoicesPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<RecurringInvoiceTemplate | undefined>();
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
  const pagination = useCursorPageStack();
  const canManage = useCan("accounting:recurring:manage");

  const query = useRecurringTemplates({
    isActive: activeFilter === "all" ? undefined : activeFilter === "true",
    cursor: pagination.cursor,
    limit: 20,
  });

  const items = query.data?.data ?? [];
  const hasMore = query.data?.pagination.hasMore ?? false;

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
      pagination.resetToFirstPage();
    }
  }

  function handleNextPage(): void {
    pagination.goToNextPage(query.data?.pagination.nextCursor);
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
        canManage ? (
          <LoadingButton size="sm" onClick={handleNewClick} isPending={false}>
            <Plus className="size-4 mr-1" />
            New template
          </LoadingButton>
        ) : null
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
          <>
            <DataTable
              className="flex-1 min-h-0"
              data={items}
              columns={columns}
              getRowKey={(row) => row.id}
              isLoading={query.isLoading}
              emptyState={
                <EmptyState
                  illustrationPreset="automations"
                  title="No recurring invoice templates"
                  description="Create templates to auto-generate invoices on a schedule."
                  action={canManage ? { label: "New template", onClick: handleNewClick } : undefined}
                />
              }
            />
            {(pagination.hasPrevious || hasMore) ? (
              <CursorPageControls
                page={pagination.page}
                hasNext={hasMore}
                onPrevious={pagination.goToPreviousPage}
                onNext={handleNextPage}
                className="mt-2"
              />
            ) : null}
          </>
        )}
      </div>

      {canManage && (
        <RecurringTemplateFormSheet
          open={sheetOpen}
          onOpenChange={handleSheetOpenChange}
          template={editTemplate}
        />
      )}
    </PageWrapper>
  );
}
