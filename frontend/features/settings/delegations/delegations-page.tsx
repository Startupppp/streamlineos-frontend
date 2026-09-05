"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldX } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { PlusIcon } from "@animateicons/react/lucide";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan, useRbacDiscoveryMembers } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import {
  useReceivedDelegations,
  useGrantedDelegations,
  useRevokeDelegation,
  type Delegation,
} from "@/hooks/api/delegations";
import { GrantDelegationSheet, type Member } from "./grant-delegation-sheet";
import {
  DELEGATION_URL_KEYS,
  readDelegationListState,
  type DelegationListKind,
} from "./delegation-list-state";
import { DelegationListPanel } from "./delegation-list-panel";

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
  const [receivedCursors, setReceivedCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [grantedCursors, setGrantedCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);

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
    setReceivedCursors([undefined]);
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
    setGrantedCursors([undefined]);
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
  } = useReceivedDelegations({
    ...receivedState,
    cursor: receivedCursors.at(-1),
  });

  const {
    data: grantedPage,
    isLoading: loadingGiven,
    isError: givenError,
    error: givenQueryError,
    refetch: refetchGiven,
  } = useGrantedDelegations({
    ...grantedState,
    cursor: grantedCursors.at(-1),
  });

  const revokeMutation = useRevokeDelegation({
    onSuccess: () => {
      toast.success("Delegation revoked");
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
  const handleReceivedPrevious = useCallback(() => {
    setReceivedCursors((current) => current.slice(0, -1));
  }, []);
  const handleReceivedNext = useCallback(() => {
    const cursor = receivedPage?.pagination.nextCursor;
    if (cursor) setReceivedCursors((current) => [...current, cursor]);
  }, [receivedPage?.pagination.nextCursor]);
  const handleReceivedLimitChange = useCallback(
    (limit: number) => {
      setReceivedCursors([undefined]);
      updateParams({
        [DELEGATION_URL_KEYS.received.size]:
          limit === 20 ? null : String(limit),
        [DELEGATION_URL_KEYS.received.page]: null,
      });
    },
    [updateParams],
  );
  const handleGrantedPrevious = useCallback(() => {
    setGrantedCursors((current) => current.slice(0, -1));
  }, []);
  const handleGrantedNext = useCallback(() => {
    const cursor = grantedPage?.pagination.nextCursor;
    if (cursor) setGrantedCursors((current) => [...current, cursor]);
  }, [grantedPage?.pagination.nextCursor]);
  const handleGrantedLimitChange = useCallback(
    (limit: number) => {
      setGrantedCursors([undefined]);
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
    void queryClient.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.delegations.all });
  }, [queryClient]);

  const received = receivedPage?.data ?? [];
  const granted = grantedPage?.data ?? [];
  const receivedPagination = receivedPage?.pagination ?? {
    limit: receivedState.limit,
    nextCursor: null,
    hasMore: false,
  };
  const grantedPagination = grantedPage?.pagination ?? {
    limit: grantedState.limit,
    nextCursor: null,
    hasMore: false,
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
              </TabsTrigger>
              <TabsTrigger value="granted" className="gap-1.5 truncate">
                Granted
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
            <DelegationListPanel
              isLoading={loadingReceived}
              isError={receivedError}
              queryError={receivedQueryError}
              delegations={received}
              memberMap={memberMap}
              listState={receivedState}
              page={receivedCursors.length}
              pagination={receivedPagination}
              nameField="delegatorId"
              onRetry={handleRetryReceived}
              onPrevious={handleReceivedPrevious}
              onNext={handleReceivedNext}
              onLimitChange={handleReceivedLimitChange}
              emptyTitle={
                receivedState.search
                  ? "No matching delegations"
                  : "No active delegations received"
              }
              emptyDescription={
                receivedState.search
                  ? "Try adjusting your search."
                  : "Active permissions delegated to you will appear here. Scheduled and ended grants do not affect your current access."
              }
              errorTitle="Could not load received delegations"
            />
          </TabsContent>

          <TabsContent value="granted" className={TAB_PANEL_CLASS}>
            <DelegationListPanel
              isLoading={loadingGiven}
              isError={givenError}
              queryError={givenQueryError}
              delegations={granted}
              memberMap={memberMap}
              listState={grantedState}
              page={grantedCursors.length}
              pagination={grantedPagination}
              nameField="delegateeId"
              onRetry={handleRetryGiven}
              onPrevious={handleGrantedPrevious}
              onNext={handleGrantedNext}
              onLimitChange={handleGrantedLimitChange}
              emptyTitle={
                grantedState.search
                  ? "No matching delegations"
                  : "No delegations granted"
              }
              emptyDescription={
                grantedState.search
                  ? "Try adjusting your search."
                  : "Delegate permissions to share access with colleagues."
              }
              errorTitle="Could not load granted delegations"
              emptyAction={
                !grantedState.search && canManageRbac
                  ? { label: "Delegate", onClick: handleOpenSheet }
                  : undefined
              }
              revokeTarget={revokeTarget}
              revokePending={revokeMutation.isPending}
              onRevoke={handleRequestRevoke}
            />
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
