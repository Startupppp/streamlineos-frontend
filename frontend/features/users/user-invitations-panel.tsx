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
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
        onError: (e) => {
          const message = getApiError(e);
          toast.error(
            message.includes("not found")
              ? "This invitation can no longer be resent."
              : message,
          );
        },
      }),
    [resend],
  );

  const handleCancelRequest = useCallback((id: string) => setCancelId(id), []);

  const handleCancelConfirm = useCallback(() => {
    if (!cancelId) return;
    cancel(cancelId, {
      onSuccess: () => { toast.success("Invitation cancelled"); setCancelId(null); },
      onError: (e) => {
        const message = getApiError(e);
        toast.error(
          message.includes("not found") || message.includes("already accepted")
            ? "This invitation can no longer be cancelled."
            : message,
        );
        setCancelId(null);
      },
    });
  }, [cancel, cancelId]);

  const handleCancelDialogChange = useCallback((open: boolean) => { if (!open) setCancelId(null); }, []);
  const handleOpenInvite = useCallback(() => setInviteOpen(true), []);
  const handleInviteChange = useCallback((v: boolean) => setInviteOpen(v), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleClearFilters = useCallback(() => updateParams({ q: null, status: null, page: null }), [updateParams]);
  const handlePageChange = useCallback((p: number) => updateParams({ page: p <= 1 ? null : String(p) }), [updateParams]);

  const pagination = data?.pagination;
  const hasFilters = !!q || status !== "all";

  const columns: DataTableColumn<Invitation>[] = [
    {
      key: "email",
      header: "Email",
      cell: (inv) => inv.email,
    },
    {
      key: "role",
      header: "Role",
      cell: (inv) => (
        <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0">{inv.role}</Badge>
      ),
    },
    {
      key: "invited",
      header: "Invited",
      className: "font-mono tabular-nums text-muted-foreground",
      cell: (inv) => format(new Date(inv.createdAt), "MMM d, yyyy"),
    },
    {
      key: "expires",
      header: "Expires",
      className: "font-mono tabular-nums text-muted-foreground",
      cell: (inv) => format(new Date(inv.expiresAt), "MMM d, yyyy"),
    },
    {
      key: "status",
      header: "Status",
      cell: (inv) => {
        const s = getStatus(inv);
        return (
          <Badge variant="outline" className={`h-4 text-[9px] px-1.5 py-0 capitalize ${STATUS_CLASSES[s]}`}>
            {s}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-[72px]",
      className: "w-[72px]",
      cell: (inv) => {
        const s = getStatus(inv);
        const canResend = s === "pending" || s === "expired";
        const canCancel = s === "pending" || s === "expired";
        if (!canResend && !canCancel) return null;
        return (
          <div className="flex items-center gap-0.5">
            {canResend && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleResend(inv.id)}
                disabled={isResending || isCancelling}
                aria-label="Resend invitation"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleCancelRequest(inv.id)}
                disabled={isResending || isCancelling}
                aria-label="Cancel invitation"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const emptyState = (
    <EmptyState
      illustrationPreset="mail"
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
  );

  return (
    <>
      <PageWrapper
        title="Invitations"
        eyebrow="People"
        subtitle={pagination ? `${pagination.total} invitation${pagination.total === 1 ? "" : "s"}` : undefined}
        actions={
          <Button size="sm" onClick={handleOpenInvite}>
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            Invite User
          </Button>
        }
        filters={<>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={handleSearchChange} placeholder="Search by email…" className="h-8 pl-7 text-xs w-[200px]" />
          </div>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </>}
      >
        {isError ? (
          <ErrorState
            title="Failed to load invitations"
            description="An error occurred while loading invitations."
            onRetry={handleRetry}
            className="flex-1 min-h-[40vh]"
          />
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowKey={(inv) => inv.id}
            isLoading={isLoading}
            emptyState={emptyState}
            pagination={{
              mode: "server",
              page,
              pageSize: 20,
              total: pagination?.total ?? 0,
              onPageChange: handlePageChange,
            }}
          />
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
