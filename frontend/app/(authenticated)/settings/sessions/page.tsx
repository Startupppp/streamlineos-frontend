"use client";

import { Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSessions, useRevokeSession, useRevokeAllSessions } from "@/hooks/api/hr/sessions";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Session = NonNullable<ReturnType<typeof useSessions>["data"]>[number];

function SessionsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function SessionRow({
  session,
  onRevoke,
  isRevokePending,
}: {
  session: Session;
  onRevoke: (id: string) => void;
  isRevokePending: boolean;
}) {
  function handleRevoke() {
    onRevoke(session.id);
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[200px]">
            {session.userAgent ?? "Unknown device"}
          </span>
          {session.isCurrent && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              Current
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {session.ipAddress ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(session.lastActive), "MMM d, yyyy HH:mm")}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(session.createdAt), "MMM d, yyyy")}
      </TableCell>
      <TableCell>
        {!session.isCurrent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRevoke}
            disabled={isRevokePending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function SessionsPage() {
  const { data: sessions, isLoading, isError, refetch } = useSessions();
  const revokeOne = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

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

  function handleRetry() {
    void refetch();
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
      ) : isError ? (
        <ErrorState
          title="Couldn't load sessions"
          description="Something went wrong while fetching your active sessions."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : !sessions || sessions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center min-h-[60vh]">
          <EmptyState
            title="No active sessions"
            description="No other sessions are currently active."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
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
                <SessionRow
                  key={s.id}
                  session={s}
                  onRevoke={handleRevoke}
                  isRevokePending={revokeOne.isPending}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
