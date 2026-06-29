"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useInvitations,
  useResendInvite,
  useCancelInvitation,
} from "@/hooks/api/users";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-client";
import { Mail, RefreshCw, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, isPast } from "date-fns";

export function UserInvitationsPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvitations({ page, limit: 20 });
  const { mutate: resend, isPending: isResending } = useResendInvite();
  const { mutate: cancel, isPending: isCancelling } = useCancelInvitation();

  const invitations = data?.data ?? [];
  const pagination = data?.pagination;

  function handleResend(id: string) {
    resend(id, {
      onSuccess: () => toast.success("Invitation resent"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleCancel(id: string) {
    cancel(id, {
      onSuccess: () => toast.success("Invitation cancelled"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded" />
        ))}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <EmptyState
        compact
        illustration={<Mail className="h-10 w-10 text-muted-foreground/40" />}
        title="No pending invitations"
        description="Invite team members using the Invite User button."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {invitations.map((inv) => {
          const expired = isPast(new Date(inv.expiresAt));
          return (
            <div
              key={inv.id}
              className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-xs"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{inv.email}</p>
                <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                  <Badge variant="secondary" className="h-4 text-[10px] px-1">
                    {inv.role}
                  </Badge>
                  {expired ? (
                    <span className="text-red-500">Expired</span>
                  ) : (
                    <span>
                      Expires {format(new Date(inv.expiresAt), "MMM d")}
                    </span>
                  )}
                  <span>Sent {format(new Date(inv.createdAt), "MMM d")}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleResend(inv.id)}
                  disabled={isResending || isCancelling}
                  title="Resend invitation"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                  onClick={() => handleCancel(inv.id)}
                  disabled={isResending || isCancelling}
                  title="Cancel invitation"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{pagination.total} invitations</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-1">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={page === pagination.totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
