"use client";

import { useState } from "react";
import { LogoutIcon, Trash2Icon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSessions, useRevokeSession, useRevokeAllSessions, type UserSession } from "@/hooks/api/hr/sessions";
import { getApiError } from "@/lib/api-client";
import { formatClientDeviceLabel, formatIpAddress } from "@/lib/format-utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export default function SessionsPage() {
  const { data: sessions, isLoading, isError, refetch } = useSessions();
  const revokeOne = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [revoking, setRevoking] = useState<UserSession | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const allSessions = sessions ?? [];
  const filtered = search
    ? allSessions.filter((s) => {
        const q = search.toLowerCase();
        return (
          (s.browser ?? "").toLowerCase().includes(q) ||
          (s.os ?? "").toLowerCase().includes(q) ||
          (s.ipAddress ?? "").toLowerCase().includes(q)
        );
      })
    : allSessions;

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function makeRevokeHandler(session: UserSession) {
    return () => setRevoking(session);
  }

  function handleRevokeConfirm() {
    if (!revoking) return;
    revokeOne.mutate(revoking.id, {
      onSuccess: () => {
        toast.success("Session revoked");
        setRevoking(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  function handleRevokeDialogOpenChange(open: boolean) {
    if (!open) setRevoking(null);
  }

  function handleRevokeAllClick() {
    setConfirmRevokeAll(true);
  }

  function handleRevokeAllConfirm() {
    revokeAll.mutate(undefined, {
      onSuccess: () => {
        toast.success("All other sessions revoked");
        setConfirmRevokeAll(false);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  function handleRevokeAllDialogOpenChange(open: boolean) {
    if (!open) setConfirmRevokeAll(false);
  }

  function handleRetry() {
    void refetch();
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
  }

  const columns: DataTableColumn<UserSession>[] = [
    {
      key: "device",
      header: "Device / Browser",
      cell: (s) => (
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[280px] font-medium">
            {formatClientDeviceLabel(s)}
          </span>
          {s.isCurrent && (
            <Badge variant="secondary" className="shrink-0 text-[10px] h-4 px-1.5">
              Current
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "ip",
      header: "IP Address",
      cell: (s) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatIpAddress(s.ipAddress)}
        </span>
      ),
    },
    {
      key: "lastActive",
      header: "Last Active",
      sortable: true,
      sortValue: (s) => new Date(s.lastActive).getTime(),
      cell: (s) => (
        <span className="text-muted-foreground text-xs">
          {format(new Date(s.lastActive), "MMM d, yyyy HH:mm")}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Signed In",
      cell: (s) => (
        <span className="text-muted-foreground text-xs">
          {format(new Date(s.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-16",
      cell: (s) =>
        s.isCurrent ? null : (
          <AnimatedIconButton
            icon={Trash2Icon}
            iconSize={16}
            variant="ghost"
            size="sm"
            onClick={makeRevokeHandler(s)}
            disabled={revokeOne.isPending}
            title="Revoke session"
            className="text-destructive hover:text-destructive"
          />
        ),
    },
  ];

  const emptyState = search ? (
    <EmptyState
      title={`No sessions matching "${search}"`}
      description="Try a different search term."
      compact
    />
  ) : (
    <EmptyState
      illustrationPreset="devices"
      title="No active sessions"
      description="No other sessions are currently active."
    />
  );

  return (
    <PageWrapper
      title="Active Sessions"
      subtitle="Manage where you're signed in. Revoking a session signs you out on that device."
      actions={
        <AnimatedIconButton
          icon={LogoutIcon}
          iconSize={16}
          iconClassName="mr-1.5"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleRevokeAllClick}
          disabled={revokeAll.isPending || allSessions.filter((s) => !s.isCurrent).length === 0}
        >
          Revoke others
        </AnimatedIconButton>
      }
      filters={
        <SearchInput placeholder="Search by device or IP…" value={search} onValueChange={handleSearchChange} />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        {isError ? (
          <ErrorState
            title="Couldn't load sessions"
            description="Something went wrong while fetching your active sessions."
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            key={pageSize}
            data={filtered}
            columns={columns}
            getRowKey={(s) => s.id}
            isLoading={isLoading}
            emptyState={emptyState}
            minWidth="600px"
            className="flex-1 min-h-0"
            pagination={{
              pageSize,
              onPageSizeChange: handlePageSizeChange,
            }}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={handleRevokeDialogOpenChange}
        title="Revoke Session"
        description="This will immediately sign out that device. Any unsaved work on that device will be lost."
        confirmLabel="Revoke"
        onConfirm={handleRevokeConfirm}
        isPending={revokeOne.isPending}
        destructive
      />

      <ConfirmDialog
        open={confirmRevokeAll}
        onOpenChange={handleRevokeAllDialogOpenChange}
        title="Revoke All Other Sessions"
        description="This will sign you out on all other devices. Your current session will remain active."
        confirmLabel="Revoke All"
        onConfirm={handleRevokeAllConfirm}
        isPending={revokeAll.isPending}
        destructive
      />
    </PageWrapper>
  );
}
