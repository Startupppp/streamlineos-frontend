"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatRelative } from "date-fns";
import { Loader2 } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
import { useOrgMembers } from "@/hooks/api/organization";
import { toast } from "sonner";
import { GrantDelegationSheet, type Member } from "./grant-delegation-sheet";
import type { Delegation } from "./delegation-schema";

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0`;

export function DelegationsPage() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: membersData } = useOrgMembers(1, 200);
  const members = useMemo(() => membersData?.data ?? [], [membersData]);
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.userId, m.name ?? m.email])),
    [members],
  );

  const { data: received, isLoading: loadingReceived } = useQuery<Delegation[]>({
    queryKey: queryKeys.delegations.received(),
    queryFn: () => apiClient.get<Delegation[]>("/access/delegations"),
    staleTime: 60_000,
  });

  const { data: given, isLoading: loadingGiven } = useQuery<Delegation[]>({
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
      setRevoking(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      setRevoking(null);
    },
  });

  const handleRevoke = useCallback(
    (id: string) => {
      setRevoking(id);
      revokeMutation.mutate(id);
    },
    [revokeMutation],
  );

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleSearchChange = useCallback((value: string) => setSearch(value), []);

  const handleGrantSuccess = useCallback(() => {
    setSheetOpen(false);
    void queryClient.invalidateQueries({ queryKey: queryKeys.delegations.all });
  }, [queryClient]);

  const matchesSearch = useCallback(
    (d: Delegation, nameField: "delegatorId" | "delegateeId") => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const name = (memberMap.get(d[nameField]) ?? "").toLowerCase();
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

  return (
    <Tabs defaultValue="received" className="flex min-h-0 flex-1 flex-col">
      <PageWrapper
        title="Delegations"
        subtitle="Share specific permissions with teammates for a set period."
        actions={
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
            ) : filteredReceived.length === 0 ? (
              <EmptyState
                illustrationPreset="permissions"
                title={search ? "No matching delegations" : "No delegations received"}
                description={
                  search
                    ? "Try adjusting your search."
                    : "Permissions delegated to you will appear here."
                }
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
                  search ? undefined : { label: "Delegate", onClick: handleOpenSheet }
                }
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
                    onRevoke={handleRevoke}
                    isRevoking={revoking === d.id}
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
        />
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
  onRevoke?: (id: string) => void;
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
    () => onRevoke?.(delegation.id),
    [delegation.id, onRevoke],
  );

  const principalId = delegation[nameField];
  const displayName = memberMap.get(principalId) ?? principalId.slice(0, 12);
  const isRevoked = delegation.status === "REVOKED";

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
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {isInactive ? "Ended" : "Ends"}{" "}
          {formatRelative(new Date(delegation.endsAt), new Date())}
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
