"use client";

import { AlertTriangle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";

interface ExpiringDoc {
  id: number;
  name: string;
  type: string;
  expiryDate: string;
  userId: string | null;
}

interface ExpiringCert {
  id: number;
  name: string;
  expiryDate: string;
  user?: { id: string; name: string | null } | null;
}

interface ExpiringDocumentsTableProps {
  expiringDocuments: ExpiringDoc[];
  expiringCertifications: ExpiringCert[];
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

interface MergedItem {
  id: number;
  name: string;
  type: string;
  category: string;
  expiryDate: string;
}

function urgencyBadge(expiryDate: string) {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days <= 7) {
    return "bg-status-danger-surface border-status-danger-rule text-status-danger-ink";
  }
  if (days <= 14) {
    return "bg-status-warning-surface border-status-warning-rule text-status-warning-ink";
  }
  return "bg-status-warning-surface border-status-warning-rule text-status-warning-ink";
}

function urgencyLabel(expiryDate: string) {
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days <= 0) return "Expired";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

const columns: DataTableColumn<MergedItem>[] = [
  {
    key: "name",
    header: "Name",
    cell: (item) => (
      <div>
        <TruncatedText text={item.name} className="text-sm font-medium text-foreground max-w-[200px]" />
        <p className="text-micro text-muted-foreground">{item.type}</p>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (item) => (
      <span className="text-xs text-muted-foreground">{item.category}</span>
    ),
  },
  {
    key: "expires",
    header: "Expires",
    className: "text-xs text-foreground",
    cell: (item) => <>{format(parseISO(item.expiryDate), "MMM d, yyyy")}</>,
  },
  {
    key: "status",
    header: "Status",
    cell: (item) => (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
          urgencyBadge(item.expiryDate),
        )}
      >
        {urgencyLabel(item.expiryDate)}
      </span>
    ),
  },
];

export function ExpiringDocumentsTable({
  expiringDocuments,
  expiringCertifications,
  isLoading,
  isError,
  error,
  onRetry,
  className,
}: ExpiringDocumentsTableProps) {
  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load expiring documents"
        description={getErrorMessage(error)}
        onRetry={onRetry}
        compact
      />
    );
  }

  const allItems: MergedItem[] = [
    ...expiringDocuments.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      category: "Document",
      expiryDate: d.expiryDate,
    })),
    ...expiringCertifications.map((c) => ({
      id: c.id,
      name: c.name,
      type: "Certification",
      category: "Certification",
      expiryDate: c.expiryDate,
    })),
  ].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  const emptyState = (
    <EmptyState
      illustration={<AlertTriangle className="w-8 text-status-success-ink" />}
      title="No expiring items"
      description="All documents and certifications are up to date within the selected window."
      compact
    />
  );

  return (
    <DataTable
      data={allItems}
      columns={columns}
      getRowKey={(item) => `${item.category}-${item.id}`}
      isLoading={isLoading}
      emptyState={emptyState}
      minWidth="480px"
      className={className}
    />
  );
}
