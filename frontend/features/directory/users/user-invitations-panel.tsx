"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useTransition, useEffect, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MailIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan, useCanManageOrganizationMembership } from "@/hooks/api/access";
import { SearchInput } from "@/components/ui/search-input";
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
import { DataTable } from "@/components/ui/data-table";
import { UserInviteDialog } from "@/features/directory/users/user-invite-dialog";
import {
  useInvitations,
  useResendInvite,
  useCancelInvitation,
  useChangeInvitationRole,
} from "@/hooks/api/users";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PeopleSectionTabs } from "./people-section-tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import {
  DEFAULT_PAGE_SIZE,
  getLastPage,
  parsePage,
  parsePageSize,
  STANDARD_PAGE_SIZE_OPTIONS,
} from "@/lib/list-pagination";
import {
  getInvitationColumns,
  type InvitationStatusFilter,
} from "./user-invitation-columns";

export {
  isInvitationResendPending,
  isInvitationRoleChangePending,
} from "./user-invitation-columns";

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
  const [cancellationInvitationId, setCancellationInvitationId] = useState<string | null>(null);
  const canManageMembership = useCanManageOrganizationMembership();
  const canViewInvitations = useCan("settings:organization:manage");
  const canInvite = canManageMembership;
  const canCancelInvitation = canManageMembership;

  const searchQuery = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "all") as InvitationStatusFilter;
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("size"));

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedLocalSearch = useDebouncedValue(localSearch, 300);

  const { data, isLoading, isError, error, refetch } = useInvitations(
    {
      page,
      limit: pageSize,
      q: searchQuery || undefined,
      status: status === "all" ? undefined : status,
      includeAccepted: status === "all" ? true : undefined,
    },
    { enabled: canViewInvitations },
  );
  const {
    mutate: resend,
    isPending: isResending,
    variables: resendingInvitationId,
  } = useResendInvite();
  const { mutate: cancel, isPending: isCancelling } = useCancelInvitation();
  const {
    mutate: changeRole,
    isPending: isChangingRole,
    variables: changingRoleVariables,
  } = useChangeInvitationRole();

  const rows = data?.data ?? [];

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const queryString = params.toString();
      startTransition(() => {
        router.replace(
          queryString ? `${pathname}?${queryString}` : pathname,
          { scroll: false },
        );
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    if (debouncedLocalSearch === searchQuery) return;
    updateParams({ q: debouncedLocalSearch || null, page: null });
  }, [debouncedLocalSearch, searchQuery, updateParams]);

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
    (invitationId: string, kind: "resend" | "reinvite" = "resend") =>
      resend(invitationId, {
        onSuccess: () =>
          toast.success(kind === "reinvite" ? "Invitation re-sent" : "Invitation resent"),
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

  const handleCancelRequest = useCallback(
    (invitationId: string) => setCancellationInvitationId(invitationId),
    [],
  );

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
    if (!cancellationInvitationId) return;
    cancel(cancellationInvitationId, {
      onSuccess: () => {
        toast.success("Invitation cancelled");
        setCancellationInvitationId(null);
      },
      onError: (e) => {
        const message = getErrorMessage(e);
        toast.error(
          message.includes("not found") || message.includes("already accepted")
            ? "This invitation can no longer be cancelled."
            : message,
        );
        setCancellationInvitationId(null);
      },
    });
  }, [cancel, cancellationInvitationId]);

  const handleCancelDialogChange = useCallback((open: boolean) => {
    if (!open) setCancellationInvitationId(null);
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
    (nextPage: number) =>
      updateParams({ page: nextPage <= 1 ? null : String(nextPage) }),
    [updateParams],
  );
  const handlePageSizeChange = useCallback(
    (size: number) =>
      updateParams({
        size: size === DEFAULT_PAGE_SIZE ? null : String(size),
        page: null,
      }),
    [updateParams],
  );
  const pagination = data?.pagination;
  const isPageOutOfRange =
    !!pagination && page > getLastPage(pagination.total, pageSize);

  useEffect(() => {
    if (!pagination) return;
    const lastPage = getLastPage(pagination.total, pageSize);
    if (page > lastPage) handlePageChange(lastPage);
  }, [handlePageChange, page, pageSize, pagination]);

  const hasFilters = !!searchQuery || status !== "all";

  const columns = useMemo(
    () =>
      getInvitationColumns({
        canInvite,
        canCancelInvitation,
        isChangingRole,
        changingInvitationId: changingRoleVariables?.invitationId,
        isResending,
        resendingInvitationId,
        isCancelling,
        onRoleChange: handleRoleChange,
        onResend: handleResend,
        onCancelRequest: handleCancelRequest,
      }),
    [
      canCancelInvitation,
      canInvite,
      changingRoleVariables?.invitationId,
      handleCancelRequest,
      handleResend,
      handleRoleChange,
      isCancelling,
      isChangingRole,
      isResending,
      resendingInvitationId,
    ],
  );

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
        title="Members & access"
        subtitle="Invite people to sign in and track invitation status."
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
          <PageTabsToolbar
            collapseBelow="lg"
            tabs={<PeopleSectionTabs />}
            search={
              <SearchInput
                value={localSearch}
                onValueChange={handleSearchChange}
                placeholder="Search by email…"
              />
            }
            filters={
              <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger
                className={`w-full lg:w-[140px] ${FILTER_SELECT_TRIGGER}`}
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
            }
          />
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {isError ? (
            <ErrorState
              title="Failed to load invitations"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              className="flex-1 min-h-0"
              data={rows}
              columns={columns}
              getRowKey={(invitation) => invitation.id}
              isLoading={isLoading || isPageOutOfRange}
              emptyState={emptyState}
              pagination={{
                mode: "server",
                page,
                pageSize,
                total: pagination?.total ?? 0,
                onPageChange: handlePageChange,
                onPageSizeChange: handlePageSizeChange,
                pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
              }}
            />
          )}
        </div>
      </PageWrapper>

      {canManageMembership ? (
        <UserInviteDialog open={inviteOpen} onOpenChange={handleInviteChange} />
      ) : null}
      <ConfirmDialog
        open={cancellationInvitationId !== null}
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
