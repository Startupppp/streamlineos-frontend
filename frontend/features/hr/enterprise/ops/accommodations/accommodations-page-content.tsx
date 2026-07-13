"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Plus, Lock } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import {
  useAccommodations,
  type AccommodationRequest,
  type AccommodationStatus,
} from "@/hooks/api/hr/enterprise-ops-accommodations";
import { AccommodationSheet } from "./accommodation-sheet";
import { AccommodationDetailSheet } from "./accommodation-detail-sheet";
import { format } from "date-fns";

const STATUS_COLORS: Record<AccommodationStatus, string> = {
  requested: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  under_review: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  denied: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  implemented: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: AccommodationStatus }) {
  return (
    <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[status]}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function AccommodationsPageContent() {
  const canManage = useCan("hr:accommodations:manage");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useAccommodations({ page });

  const columns: DataTableColumn<AccommodationRequest>[] = [
    {
      key: "type",
      header: "Type",
      cell: (r) => (
        <span className="text-sm capitalize text-foreground">{r.type.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "userId",
      header: "Employee",
      cell: (r) => <span className="text-sm text-muted-foreground font-mono text-xs">{r.userId.slice(0, 8)}…</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "confidential",
      header: "",
      cell: (r) =>
        r.confidentialMedicalNote !== undefined ? (
          <Lock className="h-3 w-3 text-muted-foreground" aria-label="Has confidential note" />
        ) : null,
    },
    {
      key: "createdAt",
      header: "Submitted",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(r.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageWrapper
        title="Accommodations"
        subtitle="Manage workplace accommodation requests"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              New Request
            </Button>
          ) : null
        }
      >
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          getRowKey={(r) => r.id}
          onRowClick={(r) => setSelectedId(r.id)}
          isLoading={isLoading}
          emptyState={<p className="text-sm text-muted-foreground text-center py-8">No accommodation requests</p>}
          pagination={
            data
              ? {
                  mode: "server",
                  page,
                  pageSize: data.pagination.limit,
                  total: data.pagination.total,
                  onPageChange: setPage,
                }
              : undefined
          }
        />
      </PageWrapper>

      <AccommodationSheet open={showCreate} onOpenChange={setShowCreate} />

      {selectedId && (
        <AccommodationDetailSheet
          id={selectedId}
          open={!!selectedId}
          onOpenChange={(open) => { if (!open) setSelectedId(null); }}
        />
      )}
    </>
  );
}
