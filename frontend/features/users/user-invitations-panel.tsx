"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useTransition, useEffect } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, isPast } from "date-fns";
import { RefreshCw } from "lucide-react";
import { MailIcon, XIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { UserInviteDialog } from "@/features/users/user-invite-dialog";
import { USER_INVITE_ROLES } from "@/features/users/user-invite-roles";
import {
  useInvitations,
  useResendInvite,
  useCancelInvitation,
  useChangeInvitationRole,
} from "@/hooks/api/users";
import type { Invitation } from "@/hooks/api/users";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";

type InvStatus = "pending" | "accepted" | "expired" | "revoked";
type StatusFilter = "all" | InvStatus;

const STATUS_CLASSES: Record<InvStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  accepted:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  expired:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  revoked:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
};

function getStatus(inv: Invitation): InvStatus {
  if (inv.status === "REVOKED") return "revoked";
  if (inv.acceptedAt || inv.status === "ACCEPTED") return "accepted";
  if (isPast(new Date(inv.expiresAt))) return "expired";
  return "pending";
}

function InvitationRoleSelect({
  invitationId,
  role,
  disabled,
  onChange,
}: {
  invitationId: string;
  role: string;
  disabled: boolean;
  onChange: (invitationId: string, role: string) => void;
}) {
  const handleValueChange = useCallback(
    (value: string) => onChange(invitationId, value),
    [invitationId, onChange],
  );

  return (
    <Select value={role} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className="h-6 w-fit min-w-[7rem] border-input bg-card text-[11px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
        {USER_INVITE_ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UserInvitationsPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const {
    open: inviteOpen,
    onOpenChange: setInviteOpen,
    setOpen: openInvite,
  } = useQueryParamOpen("create");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const canViewInvitations = useCan("hr:employees:manage");
  const canInvite = useCan("hr:employees:create");
  const canCancelInvitation = useCan("hr:employees:delete");

  const q = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "all") as StatusFilter;
  const page = Number(searchParams.get("page") ?? "1");
  const includeAccepted = status === "all" || status === "accepted" || status === "revoked";

  const [localSearch, setLocalSearch] = useState(q);
  const debouncedLocalSearch = useDebouncedValue(localSearch, 300);

  const { data, isLoading, isError, refetch } = useInvitations(
    {
      page,
      limit: 20,
      includeAccepted,
    },
    { enabled: canViewInvitations },
  );
  const { mutate: resend, isPending: isResending } = useResendInvite();
  const { mutate: cancel, isPending: isCancelling } = useCancelInvitation();
  const { mutate: changeRole, isPending: isChangingRole } = useChangeInvitationRole();

  const allRows = data?.data ?? [];
  const filtered = allRows.filter((inv) => {
    if (
      localSearch &&
      !inv.email.toLowerCase().includes(localSearch.toLowerCase())
    )
      return false;
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

  useEffect(() => {
    if (debouncedLocalSearch === q) return;
    updateParams({ q: debouncedLocalSearch || null, page: null });
  }, [debouncedLocalSearch, q, updateParams]);

  const handleSearchChange = useCallback(
    (value: string) => setLocalSearch(value),
    [],
  );

  const handleStatusChange = useCallback(
    (value: string) =>
      updateParams({ status: value === "all" ? null : value, page: null }),
    [updateParams],
  );

  const handleResend = useCallback(
    (id: string) =>
      resend(id, {
        onSuccess: () => toast.success("Invitation resent"),
        onError: (e) => {
          const message = getErrorMessage(e);
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

  const handleRoleChange = useCallback(
    (invitationId: string, role: string) => {
      changeRole(
        { invitationId, role },
        {
          onSuccess: () => toast.success("Invitation role updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [changeRole],
  );

  const handleCancelConfirm = useCallback(() => {
    if (!cancelId) return;
    cancel(cancelId, {
      onSuccess: () => {
        toast.success("Invitation cancelled");
        setCancelId(null);
      },
      onError: (e) => {
        const message = getErrorMessage(e);
        toast.error(
          message.includes("not found") || message.includes("already accepted")
            ? "This invitation can no longer be cancelled."
            : message,
        );
        setCancelId(null);
      },
    });
  }, [cancel, cancelId]);

  const handleCancelDialogChange = useCallback((open: boolean) => {
    if (!open) setCancelId(null);
  }, []);
  const handleOpenInvite = useCallback(() => openInvite(), [openInvite]);
  const handleInviteChange = useCallback(
    (v: boolean) => setInviteOpen(v),
    [setInviteOpen],
  );
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleClearFilters = useCallback(() => {
    setLocalSearch("");
    updateParams({ q: null, status: null, page: null });
  }, [updateParams]);
  const handlePageChange = useCallback(
    (p: number) => updateParams({ page: p <= 1 ? null : String(p) }),
    [updateParams],
  );

  const pagination = data?.pagination;
  const hasFilters = !!localSearch || status !== "all";

  const columns: DataTableColumn<Invitation>[] = [
    {
      key: "email",
      header: "Email",
      cell: (inv) => inv.email,
    },
    {
      key: "role",
      header: "Role",
      cell: (inv) => {
        const status = getStatus(inv);
        const editable = (status === "pending" || status === "expired") && canInvite;
        if (!editable) {
          return (
            <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0">
              {inv.role}
            </Badge>
          );
        }
        return (
          <InvitationRoleSelect
            invitationId={inv.id}
            role={inv.role}
            disabled={isChangingRole}
            onChange={handleRoleChange}
          />
        );
      },
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
        const showDeliveryFailed = inv.deliveryFailed && (s === "pending" || s === "expired");
        return (
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className={`h-4 text-[9px] px-1.5 py-0 capitalize ${STATUS_CLASSES[s]}`}
            >
              {s}
            </Badge>
            {showDeliveryFailed ? (
              <Badge
                variant="outline"
                className="h-4 text-[9px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30"
                title="The invitation email could not be delivered. Resend to try again."
              >
                Email failed
              </Badge>
            ) : null}
          </div>
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
        const isActionable = s === "pending" || s === "expired";
        const canResend = isActionable && canInvite;
        const canCancel = isActionable && canCancelInvitation;
        if (!canResend && !canCancel) return null;
        return (
          <div className="flex items-center gap-0.5">
            {canResend && (
              <LoadingButton
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleResend(inv.id)}
                isPending={isResending}
                disabled={isCancelling}
                aria-label="Resend invitation"
              >
                <RefreshCw className="h-4 w-4" />
              </LoadingButton>
            )}
            {canCancel && (
              <AnimatedIconButton
                icon={XIcon}
                iconSize={16}
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleCancelRequest(inv.id)}
                disabled={isResending || isCancelling}
                aria-label="Cancel invitation"
              />
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
          : canInvite
            ? { label: "Invite User", onClick: handleOpenInvite }
            : undefined
      }
      className="border-0 bg-transparent"
    />
  );

  return (
    <>
      <PageWrapper
        title="Invitations"
        subtitle="Manage and track team invitations."
        actions={
          canInvite ? (
            <AnimatedIconButton
              icon={MailIcon}
              iconSize={14}
              iconClassName="mr-1.5"
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleOpenInvite}
            >
              Invite User
            </AnimatedIconButton>
          ) : undefined
        }
        filters={
          <>
            <SearchInput
              value={localSearch}
              onValueChange={handleSearchChange}
              placeholder="Search by email…"
            />
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger
                className={`w-[140px] shrink-0 ${FILTER_SELECT_TRIGGER}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {isError ? (
            <ErrorState
              title="Failed to load invitations"
              description="An error occurred while loading invitations."
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              className="flex-1 min-h-0"
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
        </div>
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
