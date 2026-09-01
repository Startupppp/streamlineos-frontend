"use client";

import { useCallback, useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { Lock } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { EmptyState } from "@/components/ui/empty-state";
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
} from "@/lib/person-display";

const STATUS_COLORS: Record<AccommodationStatus, string> = {
  requested: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  under_review: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  approved: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  denied: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
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
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isFetching } = useAccommodations({ cursor });
  const { data: membersData } = useOrgMembers(1, 200);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : userId;
    },
    [memberById],
  );

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
  ], [resolveMemberName]);

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  return (
    <>
      <PageWrapper
        title="Accommodations"
        subtitle="Manage workplace accommodation requests"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusIcon size={16} className="mr-1.5" />
              New Request
            </Button>
          ) : null
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <DataTable
            className="flex-1 min-h-0"
            data={data?.data ?? []}
            columns={columns}
            getRowKey={(r) => r.id}
            onRowClick={(r) => setSelectedId(r.id)}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                illustrationPreset="team"
                title="No accommodation requests"
                description="Create a request to track workplace accommodations from intake through decision."
                action={
                  canManage
                    ? { label: "New Request", onClick: () => setShowCreate(true) }
                    : undefined
                }
                compact
              />
            }
          />
          {data && (page > 1 || data.pagination.hasMore) ? (
            <CursorPageControls
              page={page}
              hasNext={data.pagination.hasMore}
              disabled={isFetching}
              onPrevious={handlePreviousPage}
              onNext={handleNextPage}
            />
          ) : null}
        </div>
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
