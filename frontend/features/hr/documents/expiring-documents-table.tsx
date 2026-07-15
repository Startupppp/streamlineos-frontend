"use client";

import { AlertTriangle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

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
    return "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300";
  }
  if (days <= 14) {
    return "bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/40 dark:border-orange-800 dark:text-orange-300";
  }
  return "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300";
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
        <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{item.name}</p>
        <p className="text-[10px] text-muted-foreground">{item.type}</p>
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
          "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
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
  className,
}: ExpiringDocumentsTableProps) {
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
      illustration={<AlertTriangle className="w-8 text-emerald-500" />}
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
