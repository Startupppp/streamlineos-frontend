"use client";

import { Monitor, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { useSessions, useRevokeSession, useRevokeAllSessions } from "@/lib/api/hooks/auth";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function SessionsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
      <Monitor className="h-10 w-10 opacity-30" />
      <p className="text-sm">No active sessions found</p>
    </div>
  );
}

export default function SessionsPage() {
  const { data: authSession } = useSession();
  const { data: sessions, isLoading } = useSessions();
  const revokeOne = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  const currentSessionId = authSession?.sessionId;

  function handleRevoke(id: string) {
    revokeOne.mutate(id, {
      onSuccess: () => toast.success("Session revoked"),
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  function handleRevokeAll() {
    revokeAll.mutate(undefined, {
      onSuccess: () => toast.success("All other sessions revoked"),
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  return (
    <PageWrapper
      title="Active Sessions"
      subtitle="Manage where you're signed in. Revoking a session will sign you out on that device."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevokeAll}
          disabled={revokeAll.isPending}
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          Revoke all other sessions
        </Button>
      }
    >
      {isLoading ? (
        <SessionsSkeleton />
      ) : !sessions || sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device / Browser</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">
                      {s.userAgent ?? "Unknown device"}
                    </span>
                    {s.id === currentSessionId && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.ipAddress ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(s.lastActive), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(s.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {s.id !== currentSessionId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(s.id)}
                      disabled={revokeOne.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageWrapper>
  );
}
