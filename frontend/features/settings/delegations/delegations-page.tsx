"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatRelative } from "date-fns";
import { Loader2, ShieldX } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { useSession } from "next-auth/react";
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
import { toast } from "sonner";
import { GrantDelegationSheet, type Member } from "./grant-delegation-sheet";
import type { Delegation } from "./delegation-schema";

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0 h-full min-h-0 w-full flex-1 overflow-y-auto`;

export function DelegationsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Delegation | null>(null);
  const [revokeError, setRevokeError] = useState<unknown>(null);
  const [search, setSearch] = useState("");

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

  const {
    data: received,
    isLoading: loadingReceived,
    isError: receivedError,
    error: receivedQueryError,
    refetch: refetchReceived,
  } = useQuery<Delegation[]>({
    queryKey: queryKeys.delegations.received(),
    queryFn: () => apiClient.get<Delegation[]>("/access/delegations"),
    staleTime: 60_000,
  });

  const {
    data: given,
    isLoading: loadingGiven,
    isError: givenError,
    error: givenQueryError,
    refetch: refetchGiven,
  } = useQuery<Delegation[]>({
    queryKey: queryKeys.delegations.given(),
    queryFn: () => apiClient.get<Delegation[]>("/access/delegations/given"),
    staleTime: 60_000,
  });

  const revokeMutation = useMutation({
    mutationKey: [...queryKeys.delegations.all, "revoke"],
    mutationFn: (id: string) => apiClient.delete(`/access/delegations/${id}`),
    onSuccess: () => {
      toast.success("Delegation revoked");
      void queryClient.invalidateQueries({ queryKey: queryKeys.delegations.all });
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
  const handleSearchChange = useCallback((value: string) => setSearch(value), []);
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

  const matchesSearch = useCallback(
    (d: Delegation, nameField: "delegatorId" | "delegateeId") => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const resolvedName =
        (nameField === "delegatorId" ? d.delegatorName : d.delegateeName) ??
        memberMap.get(d[nameField]) ??
        "";
      const name = resolvedName.toLowerCase();
      const reason = (d.reason ?? "").toLowerCase();
      return name.includes(q) || reason.includes(q);
    },
    [search, memberMap],
  );

  const filteredReceived = useMemo(
    () => (received ?? []).filter((d) => matchesSearch(d, "delegatorId")),
    [received, matchesSearch],
  );

  const activeGiven = useMemo(
    () =>
      (given ?? []).filter(
        (d) =>
          d.status === "ACTIVE" &&
          new Date(d.endsAt) > new Date() &&
          matchesSearch(d, "delegateeId"),
      ),
    [given, matchesSearch],
  );

  const inactiveGiven = useMemo(
    () =>
      (given ?? []).filter(
        (d) =>
          (d.status !== "ACTIVE" || new Date(d.endsAt) <= new Date()) &&
          matchesSearch(d, "delegateeId"),
      ),
    [given, matchesSearch],
  );

  const receivedCount = received?.length ?? 0;
  const activeGivenCount = useMemo(
    () =>
      (given ?? []).filter(
        (d) => d.status === "ACTIVE" && new Date(d.endsAt) > new Date(),
      ).length,
    [given],
  );
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
    <Tabs defaultValue="received" className="flex min-h-0 flex-1 flex-col">
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
                  <span className="tabular-nums text-xs opacity-70">{receivedCount}</span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="granted" className="gap-1.5 truncate">
                Granted
                {!loadingGiven && activeGivenCount > 0 ? (
                  <span className="tabular-nums text-xs opacity-70">{activeGivenCount}</span>
                ) : null}
              </TabsTrigger>
            </TabsList>
            <SearchInput
              placeholder="Search by name or reason…"
              value={search}
              onValueChange={handleSearchChange}
              className="w-full min-w-0"
            />
          </>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <TabsContent value="received" className={TAB_PANEL_CLASS}>
            {loadingReceived ? (
              <DelegationSkeletons count={2} />
            ) : receivedError ? (
              <ErrorState
                compact
                title="Could not load received delegations"
                description={getErrorMessage(receivedQueryError)}
                onRetry={handleRetryReceived}
                className={PAGE_BODY_EMPTY_CLASS}
              />
            ) : filteredReceived.length === 0 ? (
              <EmptyState
                illustrationPreset="permissions"
                title={search ? "No matching delegations" : "No delegations received"}
                description={
                  search
                    ? "Try adjusting your search."
                    : "Permissions delegated to you will appear here."
                }
                className={PAGE_BODY_EMPTY_CLASS}
              />
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
                {filteredReceived.map((d) => (
                  <DelegationRow
                    key={d.id}
                    delegation={d}
                    memberMap={memberMap}
                    nameField="delegatorId"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="granted" className={TAB_PANEL_CLASS}>
            {loadingGiven ? (
              <DelegationSkeletons count={2} />
            ) : givenError ? (
              <ErrorState
                compact
                title="Could not load granted delegations"
                description={getErrorMessage(givenQueryError)}
                onRetry={handleRetryGiven}
                className={PAGE_BODY_EMPTY_CLASS}
              />
            ) : activeGiven.length === 0 && inactiveGiven.length === 0 ? (
              <EmptyState
                illustrationPreset="permissions"
                title={search ? "No matching delegations" : "No delegations granted"}
                description={
                  search
                    ? "Try adjusting your search."
                    : "Delegate permissions to share access with colleagues."
                }
                action={
                  search || !canManageRbac
                    ? undefined
                    : { label: "Delegate", onClick: handleOpenSheet }
                }
                className={PAGE_BODY_EMPTY_CLASS}
              />
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
                {activeGiven.map((d) => (
                  <DelegationRow
                    key={d.id}
                    delegation={d}
                    memberMap={memberMap}
                    nameField="delegateeId"
                    canRevoke
                    onRevoke={handleRequestRevoke}
                    isRevoking={
                      revokeMutation.isPending && revokeTarget?.id === d.id
                    }
                  />
                ))}
                {inactiveGiven.map((d) => (
                  <DelegationRow
                    key={d.id}
                    delegation={d}
                    memberMap={memberMap}
                    nameField="delegateeId"
                    isInactive
                  />
                ))}
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
  isInactive?: boolean;
}

function DelegationRow({
  delegation,
  memberMap,
  nameField,
  canRevoke,
  onRevoke,
  isRevoking,
  isInactive,
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
  const isRevoked = delegation.status === "REVOKED";
  const isScheduled =
    !isInactive &&
    delegation.status === "ACTIVE" &&
    new Date(delegation.startsAt) > new Date();

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <span className="text-sm font-medium leading-none">{displayName}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {delegation.permissions.length} permission
            {delegation.permissions.length !== 1 ? "s" : ""}
          </span>
          {isInactive && (
            <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
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
          {isInactive ? "Ended" : isScheduled ? "Starts" : "Ends"}{" "}
          {formatRelative(
            new Date(isScheduled ? delegation.startsAt : delegation.endsAt),
            new Date(),
          )}
          {delegation.reason && (
            <span className="text-muted-foreground/60"> · {delegation.reason}</span>
          )}
        </p>
      </div>
      {canRevoke && !isInactive && onRevoke && (
        isRevoking ? (
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
        )
      )}
    </div>
  );
}
