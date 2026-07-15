"use client";

import { useMemo, useState } from "react";
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
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/projects/shared/resolve-user-name";

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
  const { data: membersData } = useOrgMembers(1, 200);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = (userId: string) => {
    const member = memberById.get(userId);
    return member ? getUserDisplayName(member) : userId;
  };

  const columns: DataTableColumn<AccommodationRequest>[] = useMemo(() => [
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
      cell: (r) => <span className="text-sm text-foreground">{resolveMemberName(r.userId)}</span>,
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
  ], [memberById]);

  return (
    <>
      <PageWrapper
        title="Accommodations"
        subtitle="Manage workplace accommodation requests"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
