"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserSessions, useRevokeSession, useRevokeAllSessions } from "@/hooks/api/users";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { Monitor, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserSessionsTabProps {
  userId: string;
}

function parseUserAgent(ua: string | null): { browser: string; device: string } {
  if (!ua) return { browser: "Unknown", device: "Unknown" };
  const browser = ua.match(/Chrome\/|Firefox\/|Safari\/|Edge\//)
    ? ua.includes("Chrome") && !ua.includes("Edg")
      ? "Chrome"
      : ua.includes("Firefox")
      ? "Firefox"
      : ua.includes("Edg")
      ? "Edge"
      : "Safari"
    : "Unknown";
  const device = ua.includes("Mobile") ? "Mobile" : "Desktop";
  return { browser, device };
}

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
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        compact
        illustration={<Monitor className="h-10 w-10 text-muted-foreground/40" />}
        title="No sessions"
        description="This user has no recorded sessions."
      />
    );
  }

  const activeSessions = sessions.filter(isSessionActive);

  return (
    <div className="space-y-3 pt-1">
      {activeSessions.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeAll}
            disabled={isRevokingAll}
            className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Revoke all ({activeSessions.length})
          </Button>
        </div>
      )}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs">Browser / Device</TableHead>
              <TableHead className="text-xs">IP Address</TableHead>
              <TableHead className="text-xs">Last Active</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const { browser, device } = parseUserAgent(session.userAgent);
              const active = isSessionActive(session);
              return (
                <TableRow key={session.id} className="text-xs">
                  <TableCell>
                    <span className="font-medium">{browser}</span>
                    <span className="text-muted-foreground ml-1">· {device}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono">
                    {session.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {active ? (
                      <Badge variant="outline" className="text-[10px] border-green-200 text-green-600 bg-green-50">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground">
                        Expired
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRevoke(session.id)}
                        disabled={isRevoking}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
