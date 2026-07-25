"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ShieldOff } from "lucide-react";
import { StateIllustration } from "@/components/illustrations";
import { useCan } from "@/hooks/api/access";
import { useLegalHolds, useReleaseLegalHold, useDeleteLegalHold, type LegalHold } from "../hooks/use-legal-holds";
import { LegalHoldSheet } from "./legal-hold-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import { format } from "date-fns";

export function LegalHoldsTable() {
  const canManage = useCan("hr:legalhold:manage");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedHold, setSelectedHold] = useState<LegalHold | null>(null);

  const { data, isLoading, isError } = useLegalHolds({ page, limit: 20 });
  const release = useReleaseLegalHold();
  const remove = useDeleteLegalHold();

  function handleRelease(hold: LegalHold) {
    release.mutate(hold.id);
  }

  function handleDelete(hold: LegalHold) {
    remove.mutate(hold.id);
  }

  function handleOpenCreate() {
    setSelectedHold(null);
    setSheetOpen(true);
  }

  function handleViewItems(hold: LegalHold) {
    setSelectedHold(hold);
    setSheetOpen(true);
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
      cell: (row) => <span className="text-sm">{row.subjectUserId ?? "—"}</span>,
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
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={() => handleRelease(row)}
              isPending={release.isPending}
            >
              <ShieldOff className="h-3.5 w-3.5 mr-1" />
              Release
            </LoadingButton>
          )}
          {canManage && row.status === "released" && (
            <LoadingButton
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDelete(row)}
              isPending={remove.isPending}
            >
              Delete
            </LoadingButton>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <StateIllustration preset="security" className="h-24 w-24" />
        <p className="text-sm text-muted-foreground">Failed to load legal holds.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} legal hold{data?.total !== 1 ? "s" : ""}
        </p>
        {canManage && (
          <Button onClick={handleOpenCreate} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Shield className="h-4 w-4 mr-1.5" />
            Place Hold
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowKey={(row) => row.id}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <StateIllustration preset="security" className="h-28 w-28" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">No legal holds</p>
              <p className="text-xs text-muted-foreground">Place a legal hold to preserve records during an investigation or legal proceeding.</p>
            </div>
            {canManage && (
              <Button onClick={handleOpenCreate} size="sm" className="mt-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Shield className="h-4 w-4 mr-1.5" />
                Place Hold
              </Button>
            )}
          </div>
        }
        pagination={{
          mode: "server",
          page,
          pageSize: 20,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
      />
      <LegalHoldSheet open={sheetOpen} onClose={() => setSheetOpen(false)} hold={selectedHold} />
    </>
  );
}
