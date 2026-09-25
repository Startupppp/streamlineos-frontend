"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCursorPager } from "@/components/ui/table-pagination";
import { Shield, ShieldOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import { useLegalHolds, useReleaseLegalHold, useDeleteLegalHold, type LegalHold } from "../hooks/use-legal-holds";
import { LegalHoldSheet } from "./legal-hold-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import { format } from "date-fns";

const PAGE_SIZE = 20;

type PendingAction = { kind: "release" | "delete"; hold: LegalHold };

export function LegalHoldsTable() {
  const canManage = useCan("hr:legalhold:manage");
  const pager = useCursorPager();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedHold, setSelectedHold] = useState<LegalHold | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  // The endpoint is keyset-paginated; it ignored the `page` this used to send,
  // so every hold past the first 20 was unreachable.
  const { data, isLoading, isError, error, refetch } = useLegalHolds({ cursor: pager.cursor, limit: PAGE_SIZE });
  const release = useReleaseLegalHold();
  const remove = useDeleteLegalHold();
  const rows = data?.data ?? [];

  const subjectIds = useMemo(
    () => [...new Set((data?.data ?? []).flatMap((row) => (row.subjectUserId ? [row.subjectUserId] : [])))],
    [data],
  );
  const { data: membersData } = useOrgMembersByIds(subjectIds);
  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const pageState = usePageState({ permission: "hr:legalhold:view", isLoading, isError, error });

  function handleOpenCreate() {
    setSelectedHold(null);
    setSheetOpen(true);
  }

  function handleViewItems(hold: LegalHold) {
    setSelectedHold(hold);
    setSheetOpen(true);
  }

  function handleConfirm() {
    if (!pending) return;
    const mutation = pending.kind === "release" ? release : remove;
    mutation.mutate(pending.hold.id, { onSuccess: () => setPending(null) });
  }

  function handleConfirmOpenChange(open: boolean) {
    if (!open) setPending(null);
  }

  function handleNext() {
    pager.goNext(data?.pagination.nextCursor);
  }

  function handleRetry() {
    void refetch();
  }

  const columns: DataTableColumn<LegalHold>[] = [
    {
      key: "id",
      header: "ID",
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">#{row.id}</span>,
    },
    {
      key: "subjectUserId",
      header: "Subject",
      cell: (row) => {
        const member = row.subjectUserId ? memberById.get(row.subjectUserId) : undefined;
        return <span className="text-sm">{member ? getUserDisplayName(member) : "—"}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "active" ? "destructive" : "secondary"}>
          {row.status === "active" ? "Active" : "Released"}
        </Badge>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) => <TruncatedText text={row.reason ?? ""} className="text-sm max-w-xs" />,
    },
    {
      key: "placedAt",
      header: "Placed",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.placedAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleViewItems(row)}>
            Items
          </Button>
          {canManage && row.status === "active" && (
            <Button variant="outline" size="sm" onClick={() => setPending({ kind: "release", hold: row })}>
              <ShieldOff className="h-3.5 w-3.5 mr-1" />
              Release
            </Button>
          )}
          {canManage && row.status === "released" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setPending({ kind: "delete", hold: row })}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {canManage && (
        <div className="flex items-center justify-end mb-4 shrink-0">
          <Button onClick={handleOpenCreate} size="sm">
            <Shield className="h-4 w-4 mr-1.5" />
            Place Hold
          </Button>
        </div>
      )}
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton columns={6} className="flex-1" />}
        onRetry={handleRetry}
        className="flex-1"
      >
        <DataTable
          className="flex-1 min-h-0"
          columns={columns}
          data={rows}
          getRowKey={(row) => row.id}
          emptyState={
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              illustrationPreset="security"
              title="No legal holds"
              description="Place a legal hold to preserve records during an investigation or legal proceeding."
              action={canManage ? { label: "Place Hold", onClick: handleOpenCreate } : undefined}
            />
          }
          pagination={{
            mode: "cursor",
            pageSize: PAGE_SIZE,
            hasMore: data?.pagination.hasMore ?? false,
            hasPrevious: pager.hasPrevious,
            onNext: handleNext,
            onPrevious: pager.goPrevious,
          }}
        />
      </PageState>
      <LegalHoldSheet open={sheetOpen} onClose={() => setSheetOpen(false)} hold={selectedHold} />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={handleConfirmOpenChange}
        title={pending?.kind === "release" ? `Release legal hold #${pending.hold.id}?` : `Delete legal hold #${pending?.hold.id ?? ""}?`}
        description={
          pending?.kind === "release"
            ? "Records under this hold stop being preserved and can be deleted or exported again."
            : "The released hold is removed from this list. The audit trail keeps its record."
        }
        confirmLabel={pending?.kind === "release" ? "Release hold" : "Delete hold"}
        destructive
        isPending={release.isPending || remove.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirm}
      />
    </div>
  );
}
