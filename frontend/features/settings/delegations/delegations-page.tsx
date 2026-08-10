"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatRelative } from "date-fns";
import { Loader2, ShieldX } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { PlusIcon } from "@animateicons/react/lucide";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan, useRbacDiscoveryMembers } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { GrantDelegationSheet, type Member } from "./grant-delegation-sheet";
import type { Delegation, DelegationPage } from "./delegation-schema";
import {
  buildDelegationListUrl,
  DELEGATION_PAGE_SIZE_OPTIONS,
  DELEGATION_URL_KEYS,
  readDelegationListState,
  type DelegationListKind,
} from "./delegation-list-state";

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0 h-full min-h-0 w-full flex-1`;

export function DelegationsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const paramsSnapshot = searchParams.toString();
  const latestParamsRef = useRef(paramsSnapshot);
  const requestedReceivedSearchRef = useRef<string | null>(null);
  const requestedGrantedSearchRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Delegation | null>(null);
  const [revokeError, setRevokeError] = useState<unknown>(null);

  const activeTab: DelegationListKind =
    searchParams.get("tab") === "granted" ? "granted" : "received";
  const receivedState = readDelegationListState(searchParams, "received");
  const grantedState = readDelegationListState(searchParams, "granted");
  const [receivedSearchInput, setReceivedSearchInput] = useState(
    receivedState.search,
  );
  const [grantedSearchInput, setGrantedSearchInput] = useState(
    grantedState.search,
  );
  const debouncedReceivedSearch = useDebouncedValue(receivedSearchInput, 300);
  const debouncedGrantedSearch = useDebouncedValue(grantedSearchInput, 300);

  const canManageRbac = useCan("settings:rbac:manage");
  const membersQuery = useRbacDiscoveryMembers({ enabled: canManageRbac });
  const members = useMemo(
    () =>
      (membersQuery.data ?? []).filter(
        (member) => member.userId !== session?.user?.id,
      ),
    [membersQuery.data, session?.user?.id],
  );
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.userId, m.name ?? m.email])),
    [members],
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(latestParamsRef.current);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      latestParamsRef.current = query;
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  useEffect(() => {
    latestParamsRef.current = paramsSnapshot;
  }, [paramsSnapshot]);

  useEffect(() => {
    if (requestedReceivedSearchRef.current === receivedState.search) {
      requestedReceivedSearchRef.current = null;
      return;
    }
    // Browser history can change URL state without an input event.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReceivedSearchInput(receivedState.search);
  }, [receivedState.search]);

  useEffect(() => {
    if (requestedGrantedSearchRef.current === grantedState.search) {
      requestedGrantedSearchRef.current = null;
      return;
    }
    // Browser history can change URL state without an input event.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGrantedSearchInput(grantedState.search);
  }, [grantedState.search]);

  useEffect(() => {
    const normalizedSearch = debouncedReceivedSearch.trim();
    if (normalizedSearch === receivedState.search) return;
    requestedReceivedSearchRef.current = normalizedSearch;
    updateParams({
      [DELEGATION_URL_KEYS.received.search]:
        normalizedSearch || null,
      [DELEGATION_URL_KEYS.received.page]: null,
    });
  }, [debouncedReceivedSearch, receivedState.search, updateParams]);

  useEffect(() => {
    const normalizedSearch = debouncedGrantedSearch.trim();
    if (normalizedSearch === grantedState.search) return;
    requestedGrantedSearchRef.current = normalizedSearch;
    updateParams({
      [DELEGATION_URL_KEYS.granted.search]:
        normalizedSearch || null,
      [DELEGATION_URL_KEYS.granted.page]: null,
    });
  }, [debouncedGrantedSearch, grantedState.search, updateParams]);

  const {
    data: receivedPage,
    isLoading: loadingReceived,
    isError: receivedError,
    error: receivedQueryError,
    refetch: refetchReceived,
  } = useQuery<DelegationPage>({
    queryKey: queryKeys.delegations.received(receivedState),
    queryFn: () =>
      apiClient.get<DelegationPage>(
        buildDelegationListUrl("/access/delegations", receivedState),
      ),
    staleTime: 60_000,
  });

  const {
    data: grantedPage,
    isLoading: loadingGiven,
    isError: givenError,
    error: givenQueryError,
    refetch: refetchGiven,
  } = useQuery<DelegationPage>({
    queryKey: queryKeys.delegations.given(grantedState),
    queryFn: () =>
      apiClient.get<DelegationPage>(
        buildDelegationListUrl("/access/delegations/given", grantedState),
      ),
    staleTime: 60_000,
  });

  const revokeMutation = useMutation({
    mutationKey: [...queryKeys.delegations.all, "revoke"],
    mutationFn: (id: string) => apiClient.delete(`/access/delegations/${id}`),
    onSuccess: () => {
      toast.success("Delegation revoked");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.delegations.all,
      });
      setRevokeTarget(null);
      setRevokeError(null);
    },
    onError: (error) => {
      setRevokeError(error);
    },
  });

  const handleRequestRevoke = useCallback((delegation: Delegation) => {
    setRevokeError(null);
    setRevokeTarget(delegation);
  }, []);

  const handleConfirmRevoke = useCallback(() => {
    if (!revokeTarget) return;
    setRevokeError(null);
    revokeMutation.mutate(revokeTarget.id);
  }, [revokeMutation, revokeTarget]);

  const handleRevokeOpenChange = useCallback((open: boolean) => {
    if (open) return;
    setRevokeTarget(null);
    setRevokeError(null);
  }, []);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleTabChange = useCallback(
    (value: string) => {
      if (value !== "received" && value !== "granted") return;
      updateParams({ tab: value === "received" ? null : value });
    },
    [updateParams],
  );
  const handleSearchChange = useCallback(
    (value: string) => {
      if (activeTab === "received") setReceivedSearchInput(value);
      else setGrantedSearchInput(value);
    },
    [activeTab],
  );
  const handleReceivedPageChange = useCallback(
    (page: number) => {
      updateParams({
        [DELEGATION_URL_KEYS.received.page]: page === 1 ? null : String(page),
      });
    },
    [updateParams],
  );
  const handleReceivedLimitChange = useCallback(
    (limit: number) => {
      updateParams({
        [DELEGATION_URL_KEYS.received.size]:
          limit === 20 ? null : String(limit),
        [DELEGATION_URL_KEYS.received.page]: null,
      });
    },
    [updateParams],
  );
  const handleGrantedPageChange = useCallback(
    (page: number) => {
      updateParams({
        [DELEGATION_URL_KEYS.granted.page]: page === 1 ? null : String(page),
      });
    },
    [updateParams],
  );
  const handleGrantedLimitChange = useCallback(
    (limit: number) => {
      updateParams({
        [DELEGATION_URL_KEYS.granted.size]: limit === 20 ? null : String(limit),
        [DELEGATION_URL_KEYS.granted.page]: null,
      });
    },
    [updateParams],
  );
  const handleRetryReceived = useCallback(() => {
    void refetchReceived();
  }, [refetchReceived]);
  const handleRetryGiven = useCallback(() => {
    void refetchGiven();
  }, [refetchGiven]);
  const handleRetryMembers = useCallback(() => {
    void membersQuery.refetch();
  }, [membersQuery]);

  const handleGrantSuccess = useCallback(() => {
    setSheetOpen(false);
    void queryClient.invalidateQueries({ queryKey: queryKeys.delegations.all });
  }, [queryClient]);

  const receivedTotalPages = receivedPage?.pagination.totalPages;
  const grantedTotalPages = grantedPage?.pagination.totalPages;

  const received = receivedPage?.data ?? [];
  const granted = grantedPage?.data ?? [];
  const receivedCount = receivedPage?.pagination.total ?? 0;
  const grantedCount = grantedPage?.pagination.total ?? 0;
  const receivedPagination = receivedPage?.pagination ?? {
    page: receivedState.page,
    limit: receivedState.limit,
    total: 0,
    totalPages: 0,
  };
  const grantedPagination = grantedPage?.pagination ?? {
    page: grantedState.page,
    limit: grantedState.limit,
    total: 0,
    totalPages: 0,
  };
  const activeSearch =
    activeTab === "received" ? receivedSearchInput : grantedSearchInput;
  const revokeDescription = revokeTarget
    ? (revokeTarget.delegateeName ??
        memberMap.get(revokeTarget.delegateeId) ??
        "This member") +
      " will lose " +
      revokeTarget.permissions.length +
      " delegated permission" +
      (revokeTarget.permissions.length === 1 ? "" : "s") +
      ". Existing audit history is preserved."
    : "";

  useEffect(() => {
    if (receivedTotalPages === undefined) return;
    const lastPage = Math.max(1, receivedTotalPages);
    if (receivedState.page <= lastPage) return;
    updateParams({
      [DELEGATION_URL_KEYS.received.page]:
        lastPage === 1 ? null : String(lastPage),
    });
  }, [receivedState.page, receivedTotalPages, updateParams]);

  useEffect(() => {
    if (grantedTotalPages === undefined) return;
    const lastPage = Math.max(1, grantedTotalPages);
    if (grantedState.page <= lastPage) return;
    updateParams({
      [DELEGATION_URL_KEYS.granted.page]:
        lastPage === 1 ? null : String(lastPage),
    });
  }, [grantedState.page, grantedTotalPages, updateParams]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <PageWrapper
        title="Delegations"
        subtitle="Share specific permissions with teammates for a set period."
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
        actions={
          canManageRbac ? (
            <AnimatedIconButton
              size="sm"
              icon={PlusIcon}
              iconSize={14}
              iconClassName="mr-1.5"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleOpenSheet}
            >
              Delegate
            </AnimatedIconButton>
          ) : undefined
        }
        filtersClassName="flex-col items-stretch gap-2 overflow-visible md:flex-row md:items-center md:justify-between [&>[data-slot=search-input]]:flex-none [&>[data-slot=search-input]]:basis-auto"
        filters={
          <>
            <TabsList className="w-full shrink-0 md:w-auto">
              <TabsTrigger value="received" className="gap-1.5 truncate">
                Received
                {!loadingReceived && receivedCount > 0 ? (
                  <span className="tabular-nums text-xs opacity-70">
                    {receivedCount}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="granted" className="gap-1.5 truncate">
                Granted
                {!loadingGiven && grantedCount > 0 ? (
                  <span className="tabular-nums text-xs opacity-70">
                    {grantedCount}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>
            <SearchInput
              placeholder="Search by name or reason…"
              value={activeSearch}
              onValueChange={handleSearchChange}
              className="w-full min-w-0"
            />
          </>
        }
      >
        <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
          <TabsContent value="received" className={TAB_PANEL_CLASS}>
            {loadingReceived ? (
              <div className="flex h-full min-h-0 flex-1 flex-col">
                <DelegationSkeletons count={Math.min(receivedState.limit, 5)} />
              </div>
            ) : receivedError ? (
              <ErrorState
                compact
                title="Could not load received delegations"
                description={getErrorMessage(receivedQueryError)}
                onRetry={handleRetryReceived}
                className={PAGE_BODY_EMPTY_CLASS}
              />
            ) : received.length === 0 ? (
              <EmptyState
                illustrationPreset="permissions"
                title={
                  receivedState.search
                    ? "No matching delegations"
                    : "No active delegations received"
                }
                description={
                  receivedState.search
                    ? "Try adjusting your search."
                    : "Active permissions delegated to you will appear here. Scheduled and ended grants do not affect your current access."
                }
                className={PAGE_BODY_EMPTY_CLASS}
              />
            ) : (
              <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
                  <div className="h-full min-h-0 overflow-y-auto scrollbar-hide divide-y divide-border/60">
                    {received.map((delegation) => (
                      <DelegationRow
                        key={delegation.id}
                        delegation={delegation}
                        memberMap={memberMap}
                        nameField="delegatorId"
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-auto shrink-0">
                  <DataTablePagination
                    page={receivedPagination.page}
                    totalPages={receivedPagination.totalPages}
                    total={receivedPagination.total}
                    limit={receivedPagination.limit}
                    onPageChange={handleReceivedPageChange}
                    onLimitChange={handleReceivedLimitChange}
                    pageSizeOptions={DELEGATION_PAGE_SIZE_OPTIONS}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="granted" className={TAB_PANEL_CLASS}>
            {loadingGiven ? (
              <DelegationSkeletons count={Math.min(grantedState.limit, 5)} />
            ) : givenError ? (
              <ErrorState
                compact
                title="Could not load granted delegations"
                description={getErrorMessage(givenQueryError)}
                onRetry={handleRetryGiven}
                className={PAGE_BODY_EMPTY_CLASS}
              />
            ) : granted.length === 0 ? (
              <EmptyState
                illustrationPreset="permissions"
                title={
                  grantedState.search
                    ? "No matching delegations"
                    : "No delegations granted"
                }
                description={
                  grantedState.search
                    ? "Try adjusting your search."
                    : "Delegate permissions to share access with colleagues."
                }
                action={
                  grantedState.search || !canManageRbac
                    ? undefined
                    : { label: "Delegate", onClick: handleOpenSheet }
                }
                className={PAGE_BODY_EMPTY_CLASS}
              />
            ) : (
              <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
                  <div className="h-full min-h-0 overflow-y-auto scrollbar-hide divide-y divide-border/60">
                    {granted.map((delegation) => (
                      <DelegationRow
                        key={delegation.id}
                        delegation={delegation}
                        memberMap={memberMap}
                        nameField="delegateeId"
                        canRevoke={
                          delegation.lifecycle === "ACTIVE" ||
                          delegation.lifecycle === "SCHEDULED"
                        }
                        onRevoke={handleRequestRevoke}
                        isRevoking={
                          revokeMutation.isPending &&
                          revokeTarget?.id === delegation.id
                        }
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-auto shrink-0">
                  <DataTablePagination
                    page={grantedPagination.page}
                    totalPages={grantedPagination.totalPages}
                    total={grantedPagination.total}
                    limit={grantedPagination.limit}
                    onPageChange={handleGrantedPageChange}
                    onLimitChange={handleGrantedLimitChange}
                    pageSizeOptions={DELEGATION_PAGE_SIZE_OPTIONS}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </div>

        <GrantDelegationSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onSuccess={handleGrantSuccess}
          members={members as Member[]}
          membersLoading={membersQuery.isLoading}
          membersError={membersQuery.error}
          onRetryMembers={handleRetryMembers}
        />
        {revokeTarget ? (
          <ConfirmDialog
            open
            onOpenChange={handleRevokeOpenChange}
            title="Revoke this delegation?"
            description={revokeDescription}
            icon={
              <span className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldX className="size-4" aria-hidden />
              </span>
            }
            content={
              revokeError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                >
                  {getErrorMessage(revokeError)}
                </div>
              ) : null
            }
            confirmLabel={revokeError ? "Try again" : "Revoke delegation"}
            destructive
            keepOpenOnConfirm
            isPending={revokeMutation.isPending}
            onConfirm={handleConfirmRevoke}
          />
        ) : null}
      </PageWrapper>
    </Tabs>
  );
}

function DelegationSkeletons({ count }: { count: number }) {
  return (
    <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface DelegationRowProps {
  delegation: Delegation;
  memberMap: Map<string, string>;
  nameField: "delegatorId" | "delegateeId";
  canRevoke?: boolean;
  onRevoke?: (delegation: Delegation) => void;
  isRevoking?: boolean;
}

function DelegationRow({
  delegation,
  memberMap,
  nameField,
  canRevoke,
  onRevoke,
  isRevoking,
}: DelegationRowProps) {
  const handleRevoke = useCallback(
    () => onRevoke?.(delegation),
    [delegation, onRevoke],
  );

  const principalId = delegation[nameField];
  const displayName =
    (nameField === "delegatorId"
      ? delegation.delegatorName
      : delegation.delegateeName) ??
    memberMap.get(principalId) ??
    "Team member";
  const isRevoked = delegation.lifecycle === "REVOKED";
  const isExpired = delegation.lifecycle === "EXPIRED";
  const isInactive = isRevoked || isExpired;
  const isScheduled = delegation.lifecycle === "SCHEDULED";
  const lifecycleLabel = isRevoked
    ? "Revoked"
    : isExpired
      ? "Expired"
      : isScheduled
        ? "Starts"
        : "Ends";
  const lifecycleDate = isRevoked
    ? (delegation.revokedAt ?? delegation.endsAt)
    : isScheduled
      ? delegation.startsAt
      : delegation.endsAt;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <span className="text-sm font-medium leading-none">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {delegation.permissions.length} permission
            {delegation.permissions.length !== 1 ? "s" : ""}
          </span>
          {isInactive && (
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground shrink-0"
            >
              {isRevoked ? "Revoked" : "Expired"}
            </Badge>
          )}
          {isScheduled ? (
            <Badge variant="outline" className="shrink-0 text-xs text-blue-600">
              Scheduled
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {lifecycleLabel} {formatRelative(new Date(lifecycleDate), new Date())}
          {delegation.reason && (
            <span className="text-muted-foreground/60">
              {" "}
              · {delegation.reason}
            </span>
          )}
        </p>
      </div>
      {canRevoke &&
        !isInactive &&
        onRevoke &&
        (isRevoking ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-7 shrink-0 text-muted-foreground"
            disabled
            aria-label="Revoking"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </Button>
        ) : (
          <AnimatedIconButton
            icon={XIcon}
            iconSize={14}
            variant="ghost"
            size="icon"
            className="w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleRevoke}
            aria-label="Revoke delegation"
          />
        ))}
    </div>
  );
}
