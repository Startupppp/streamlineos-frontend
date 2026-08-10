"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useUserSessions, useRevokeSession, useRevokeAllSessions } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatClientDeviceLabel, formatIpAddress } from "@/lib/format-utils";
import { toast } from "sonner";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { formatDistanceToNow } from "date-fns";

interface UserSessionsTabProps {
  userId: string;
}

type Session = {
  id: string;
  userAgent: string | null;
  browser: string;
  os: string | null;
  platform: string | null;
  ipAddress: string | null;
  lastActive: string;
  isRevoked: boolean;
  expiresAt: string | null;
};

function isSessionActive(session: { isRevoked: boolean; expiresAt: string | null }): boolean {
  if (session.isRevoked) return false;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) return false;
  return true;
}

export function UserSessionsTab({ userId }: UserSessionsTabProps) {
  const { data: sessions, isLoading, error, refetch } = useUserSessions(userId);
  const { mutate: revokeSession, isPending: isRevoking } = useRevokeSession();
  const { mutate: revokeAll, isPending: isRevokingAll } = useRevokeAllSessions();

  function handleRevoke(sessionId: string) {
    revokeSession(
      { userId, sessionId },
      {
        onSuccess: () => toast.success("Session revoked"),
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }

  function handleRevokeAll() {
    revokeAll(userId, {
      onSuccess: () => toast.success("All sessions revoked"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        compact
        className="flex-1 w-full min-h-0"
        illustrationPreset="alert"
        title="Couldn't load sessions"
        description={getErrorMessage(error)}
        action={{ label: "Retry", onClick: handleRetry }}
      />
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        compact
        className="flex-1 w-full min-h-0"
        illustrationPreset="devices"
        title="No sessions"
        description="This user has no recorded sessions."
      />
    );
  }

  const activeSessions = sessions.filter(isSessionActive);

  const columns: DataTableColumn<Session>[] = [
    {
      key: "browser",
      header: "Browser / Device",
      cell: (row) => (
        <span className="font-medium">{formatClientDeviceLabel(row)}</span>
      ),
    },
    {
      key: "ip",
      header: "IP Address",
      cell: (row) => (
        <span className="text-muted-foreground font-mono">{formatIpAddress(row.ipAddress)}</span>
      ),
    },
    {
      key: "lastActive",
      header: "Last Active",
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(row.lastActive), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const active = isSessionActive(row);
        return active ? (
          <Badge variant="outline" className="text-[10px] border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground">
            Expired
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-20",
      cell: (row) => {
        const active = isSessionActive(row);
        if (!active) return null;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleRevoke(row.id)}
              disabled={isRevoking}
            >
              Revoke
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-2">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium">Authenticated sessions</p>
          <p className="text-[11px] text-muted-foreground">
            Current browser access that can be revoked immediately.
          </p>
        </div>
        {activeSessions.length > 0 ? (
          <AnimatedIconButton
            icon={Trash2Icon}
            iconSize={14}
            iconClassName="mr-1 text-destructive"
            variant="outline"
            size="sm"
            onClick={handleRevokeAll}
            disabled={isRevokingAll}
            className="h-9 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive [&_svg:not([class*='text-'])]:text-destructive hover:[&_svg:not([class*='text-'])]:text-destructive"
          >
            Revoke all ({activeSessions.length})
          </AnimatedIconButton>
        ) : null}
      </div>
      <DataTable
        data={sessions}
        columns={columns}
        getRowKey={(session) => session.id}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
