"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, isPast } from "date-fns";
import { Search, Mail, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserInviteDialog } from "@/features/users/user-invite-dialog";
import {
  useInvitations,
  useResendInvite,
  useCancelInvitation,
} from "@/hooks/api/users";
import type { Invitation } from "@/hooks/api/users";
import { getApiError } from "@/lib/api-client";

type InvStatus = "pending" | "accepted" | "expired";
type StatusFilter = "all" | InvStatus;

const STATUS_CLASSES: Record<InvStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expired: "bg-red-50 text-red-700 border-red-200",
};

function getStatus(inv: Invitation): InvStatus {
  if (inv.acceptedAt) return "accepted";
  if (isPast(new Date(inv.expiresAt))) return "expired";
  return "pending";
}

function InvitationTableRow({ inv, onResend, onCancel, isResending, isCancelling }: {
  inv: Invitation; onResend: (id: string) => void; onCancel: (id: string) => void;
  isResending: boolean; isCancelling: boolean;
}) {
  const status = getStatus(inv);
  const handleResend = useCallback(() => onResend(inv.id), [inv.id, onResend]);
  const handleCancel = useCallback(() => onCancel(inv.id), [inv.id, onCancel]);

  return (
    <tr className="h-8 hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
      <td className="px-2 py-1 text-[11px]">{inv.email}</td>
      <td className="px-2 py-1">
        <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0">{inv.role}</Badge>
      </td>
      <td className="px-2 py-1 font-mono tabular-nums text-[11px] text-muted-foreground">
        {format(new Date(inv.createdAt), "MMM d, yyyy")}
      </td>
      <td className="px-2 py-1 font-mono tabular-nums text-[11px] text-muted-foreground">
        {format(new Date(inv.expiresAt), "MMM d, yyyy")}
      </td>
      <td className="px-2 py-1">
        <Badge variant="outline" className={`h-4 text-[9px] px-1.5 py-0 capitalize ${STATUS_CLASSES[status]}`}>
          {status}
        </Badge>
      </td>
      <td className="w-[72px] px-2 py-1">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleResend}
            disabled={isResending || isCancelling}
            aria-label="Resend invitation"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleCancel}
            disabled={isResending || isCancelling}
            aria-label="Cancel invitation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function UserInvitationsPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const q = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "all") as StatusFilter;
  const page = Number(searchParams.get("page") ?? "1");
  const includeAccepted = status === "all" || status === "accepted";

  const { data, isLoading, isError, refetch } = useInvitations({ page, limit: 20, includeAccepted });
  const { mutate: resend, isPending: isResending } = useResendInvite();
  const { mutate: cancel, isPending: isCancelling } = useCancelInvitation();

  const allRows = data?.data ?? [];
  const filtered = allRows.filter((inv) => {
    if (q && !inv.email.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== "all" && getStatus(inv) !== status) return false;
    return true;
  });

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateParams({ q: e.target.value || null, page: null }),
    [updateParams],
  );

  const handleStatusChange = useCallback(
    (value: string) => updateParams({ status: value === "all" ? null : value, page: null }),
    [updateParams],
  );

  const handleResend = useCallback(
    (id: string) =>
      resend(id, {
        onSuccess: () => toast.success("Invitation resent"),
        onError: (e) => toast.error(getApiError(e)),
      }),
    [resend],
  );

  const handleCancelRequest = useCallback((id: string) => setCancelId(id), []);

  const handleCancelConfirm = useCallback(() => {
    if (!cancelId) return;
    cancel(cancelId, {
      onSuccess: () => { toast.success("Invitation cancelled"); setCancelId(null); },
      onError: (e) => { toast.error(getApiError(e)); setCancelId(null); },
    });
  }, [cancel, cancelId]);

  const handleCancelDialogChange = useCallback((open: boolean) => { if (!open) setCancelId(null); }, []);
  const handleOpenInvite = useCallback(() => setInviteOpen(true), []);
  const handleInviteChange = useCallback((v: boolean) => setInviteOpen(v), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleClearFilters = useCallback(
    () => updateParams({ q: null, status: null, page: null }),
    [updateParams],
  );
  const handlePrevPage = useCallback(
    () => updateParams({ page: page <= 2 ? null : String(page - 1) }),
    [page, updateParams],
  );
  const handleNextPage = useCallback(
    () => updateParams({ page: String(page + 1) }),
    [page, updateParams],
  );

  const pagination = data?.pagination;
  const hasFilters = !!q || status !== "all";

  return (
    <>
      <PageWrapper
        title="Invitations"
        eyebrow="People"
        subtitle={
          pagination
            ? `${pagination.total} invitation${pagination.total === 1 ? "" : "s"}`
            : undefined
        }
        actions={
          <Button size="sm" onClick={handleOpenInvite}>
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            Invite User
          </Button>
        }
        filters={
          <>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={handleSearchChange}
                placeholder="Search by email…"
                className="h-8 pl-7 text-xs w-[200px]"
              />
            </div>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      >
        {isLoading ? (
          <SkeletonTable rows={8} columns={6} />
        ) : isError ? (
          <ErrorState
            title="Failed to load invitations"
            description="An error occurred while loading invitations."
            onRetry={handleRetry}
            className="flex-1 min-h-[40vh]"
          />
        ) : (
          <div className="border border-border rounded-md flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="min-w-max">
                <table className="w-full caption-bottom text-[11px]">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                    <tr className="border-b-2 border-border">
                      <th className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-left text-muted-foreground">Email</th>
                      <th className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-left text-muted-foreground">Role</th>
                      <th className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-left text-muted-foreground">Invited</th>
                      <th className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-left text-muted-foreground">Expires</th>
                      <th className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-left text-muted-foreground">Status</th>
                      <th className="w-[72px] px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <EmptyState
                            illustration={<Mail className="h-8 w-8 text-muted-foreground/40" />}
                            title={hasFilters ? "No results" : "No invitations yet"}
                            description={
                              hasFilters
                                ? "No invitations match your filters."
                                : "Invite your first team member to get started."
                            }
                            action={
                              hasFilters
                                ? { label: "Clear filters", onClick: handleClearFilters }
                                : { label: "Invite User", onClick: handleOpenInvite }
                            }
                            className="border-0 bg-transparent min-h-[40vh]"
                          />
                        </td>
                      </tr>
                    ) : (
                      filtered.map((inv) => (
                        <InvitationTableRow
                          key={inv.id}
                          inv={inv}
                          onResend={handleResend}
                          onCancel={handleCancelRequest}
                          isResending={isResending}
                          isCancelling={isCancelling}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={handlePrevPage}>Prev</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= pagination.totalPages} onClick={handleNextPage}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </PageWrapper>

      <UserInviteDialog open={inviteOpen} onOpenChange={handleInviteChange} />
      <ConfirmDialog
        open={cancelId !== null}
        onOpenChange={handleCancelDialogChange}
        title="Cancel invitation"
        description="This will revoke the invitation. The recipient will no longer be able to join using this link."
        confirmLabel="Cancel invitation"
        destructive
        isPending={isCancelling}
        onConfirm={handleCancelConfirm}
      />
    </>
  );
}
