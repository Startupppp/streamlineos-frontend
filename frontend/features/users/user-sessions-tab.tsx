"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useUserSessions, useRevokeSession, useRevokeAllSessions } from "@/hooks/api/users";
import { getApiError } from "@/lib/api-client";
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
  const { data: sessions, isLoading } = useUserSessions(userId);
  const { mutate: revokeSession, isPending: isRevoking } = useRevokeSession();
  const { mutate: revokeAll, isPending: isRevokingAll } = useRevokeAllSessions();

  function handleRevoke(sessionId: string) {
    revokeSession(
      { userId, sessionId },
      {
        onSuccess: () => toast.success("Session revoked"),
        onError: (e) => toast.error(getApiError(e)),
      }
    );
  }

  function handleRevokeAll() {
    revokeAll(userId, {
      onSuccess: () => toast.success("All sessions revoked"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        compact
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
        <>
          <span className="font-medium">{row.browser}</span>
          <span className="text-muted-foreground ml-1">
            · {row.os ?? row.platform ?? "Unknown"}
          </span>
        </>
      ),
    },
    {
      key: "ip",
      header: "IP Address",
      cell: (row) => (
        <span className="text-muted-foreground font-mono">{row.ipAddress ?? "—"}</span>
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
              className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
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
    <div className="space-y-3 pt-1">
      {activeSessions.length > 0 && (
        <div className="flex justify-end">
          <AnimatedIconButton
            icon={Trash2Icon}
            iconSize={14}
            iconClassName="mr-1"
            variant="outline"
            size="sm"
            onClick={handleRevokeAll}
            disabled={isRevokingAll}
            className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10 h-7 text-xs"
          >
            Revoke all ({activeSessions.length})
          </AnimatedIconButton>
        </div>
      )}
      <DataTable
        data={sessions}
        columns={columns}
        getRowKey={(session) => session.id}
      />
    </div>
  );
}
