"use client";

import { useCallback, useMemo, useState } from "react";
import { useKbSources } from "@/hooks/api/kb/sources";
import { useKbSpaces } from "@/hooks/api/kb/spaces";
import { useKbAskPageOwners } from "@/hooks/api/kb/ask";
import { useKbPagesSearch } from "@/hooks/api/kb/pages";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import type {
  SourceKindFilter,
  OwnerFilter,
  SpaceIdFilter,
  OwnerMembershipFilter,
  StatusScopeFilter,
} from "@/features/wiki/components/kb-sources-sheet";
import type { KbSourcesParams } from "@/hooks/api/kb/sources";
import type { KbAskScopedInput } from "@/hooks/api/kb/ask";

interface UseKbScopeFilterParams {
  currentUserId: string | undefined;
  scopeSheetOpen: boolean;
}

export type KbScopePayload = Pick<
  KbAskScopedInput,
  "sourceIds" | "pageIds" | "verifiedOnly" | "spaceId" | "ownerMembershipId" | "status"
>;

export function useKbScopeFilter({ currentUserId, scopeSheetOpen }: UseKbScopeFilterParams) {
  const [scopeSourceIds, setScopeSourceIds] = useState<number[]>([]);
  const [pendingScopeIds, setPendingScopeIds] = useState<number[]>([]);
  const [scopeVerifiedOnly, setScopeVerifiedOnly] = useState(false);
  const [pendingVerifiedOnly, setPendingVerifiedOnly] = useState(false);
  const [scopePageIds, setScopePageIds] = useState<number[]>([]);
  const [pendingPageIds, setPendingPageIds] = useState<number[]>([]);
  const [scopeSpaceId, setScopeSpaceId] = useState<SpaceIdFilter>(null);
  const [pendingSpaceId, setPendingSpaceId] = useState<SpaceIdFilter>(null);
  const [scopeOwnerMembershipId, setScopeOwnerMembershipId] = useState<OwnerMembershipFilter>(null);
  const [pendingOwnerMembershipId, setPendingOwnerMembershipId] = useState<OwnerMembershipFilter>(null);
  const [scopeStatus, setScopeStatus] = useState<StatusScopeFilter>(null);
  const [pendingStatus, setPendingStatus] = useState<StatusScopeFilter>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [pageSearchQuery, setPageSearchQuery] = useState("");
  const [scopeKindFilter, setScopeKindFilter] = useState<SourceKindFilter>("all");
  const [scopeOwnerFilter, setScopeOwnerFilter] = useState<OwnerFilter>("all");

  const sourcesQuery = useKbSources();
  const sources = useMemo(
    () => (sourcesQuery.data?.pages ?? []).flatMap((p) => p.data),
    [sourcesQuery.data],
  );

  const scopeFilters: KbSourcesParams = useMemo(
    () => ({
      kind: scopeKindFilter !== "all" ? scopeKindFilter : undefined,
      createdById:
        scopeOwnerFilter === "mine" && currentUserId ? currentUserId : undefined,
    }),
    [scopeKindFilter, scopeOwnerFilter, currentUserId],
  );

  const hasScopeFilters =
    scopeFilters.kind !== undefined || scopeFilters.createdById !== undefined;

  const scopeSourcesQuery = useKbSources(hasScopeFilters ? scopeFilters : undefined);
  const scopeSources = useMemo(
    () => (scopeSourcesQuery.data?.pages ?? []).flatMap((p) => p.data),
    [scopeSourcesQuery.data],
  );

  const spacesQuery = useKbSpaces();
  const kbSpaces = useMemo(() => spacesQuery.data?.data ?? [], [spacesQuery.data]);

  const debouncedOwnerSearch = useDebouncedValue(ownerSearch.trim(), 300);
  const ownersQuery = useKbAskPageOwners(
    debouncedOwnerSearch,
    pendingOwnerMembershipId ?? undefined,
    scopeSheetOpen,
  );
  const scopeOwners = useMemo(
    () => (ownersQuery.data?.pages ?? []).flatMap((p) => p.data),
    [ownersQuery.data],
  );
  const selectedScopeOwner = ownersQuery.data?.pages[0]?.selected ?? null;

  const debouncedPageSearchQuery = useDebouncedValue(pageSearchQuery.trim(), 300);
  const pageSearchResult = useKbPagesSearch(debouncedPageSearchQuery);
  const pageSearchResults = useMemo(
    () => pageSearchResult.data?.items ?? [],
    [pageSearchResult.data],
  );
  const pageSearchIsLoading = pageSearchResult.isLoading;

  const clientFilteredSources = useMemo(
    () =>
      sources.filter((source) => {
        if (scopeFilters.kind !== undefined && source.kind !== scopeFilters.kind) return false;
        if (
          scopeFilters.createdById !== undefined &&
          source.createdById !== scopeFilters.createdById
        )
          return false;
        return true;
      }),
    [sources, scopeFilters],
  );

  const baseDisplaySources = useMemo(
    () =>
      !hasScopeFilters
        ? sources
        : scopeSourcesQuery.isError
          ? clientFilteredSources
          : scopeSources,
    [hasScopeFilters, sources, scopeSourcesQuery.isError, clientFilteredSources, scopeSources],
  );

  const scopeDisplaySources = useMemo(
    () =>
      pendingSpaceId !== null
        ? baseDisplaySources.filter((s) => s.spaceId === pendingSpaceId)
        : baseDisplaySources,
    [pendingSpaceId, baseDisplaySources],
  );

  const activeScopeSourcesQuery = hasScopeFilters ? scopeSourcesQuery : sourcesQuery;

  const scopeActive =
    scopeSourceIds.length > 0 ||
    scopeVerifiedOnly ||
    scopePageIds.length > 0 ||
    scopeSpaceId !== null ||
    scopeOwnerMembershipId !== null ||
    scopeStatus !== null;

  const scopeItemCount = scopeSourceIds.length + scopePageIds.length;
  const scopeSummary =
    scopeItemCount > 0
      ? `${scopeItemCount} item${scopeItemCount === 1 ? "" : "s"}`
      : "Filtered";

  const scopePayload = useMemo(
    (): KbScopePayload => ({
      ...(scopeSourceIds.length > 0 ? { sourceIds: scopeSourceIds } : {}),
      ...(scopePageIds.length > 0 ? { pageIds: scopePageIds } : {}),
      ...(scopeVerifiedOnly ? { verifiedOnly: true } : {}),
      ...(scopeSpaceId !== null ? { spaceId: scopeSpaceId } : {}),
      ...(scopeOwnerMembershipId !== null ? { ownerMembershipId: scopeOwnerMembershipId } : {}),
      ...(scopeStatus !== null ? { status: scopeStatus } : {}),
    }),
    [
      scopeSourceIds,
      scopePageIds,
      scopeVerifiedOnly,
      scopeSpaceId,
      scopeOwnerMembershipId,
      scopeStatus,
    ],
  );

  const onScopeSheetOpen = useCallback(() => {
    setPendingScopeIds(scopeSourceIds);
    setPendingVerifiedOnly(scopeVerifiedOnly);
    setPendingPageIds(scopePageIds);
    setPendingSpaceId(scopeSpaceId);
    setPendingOwnerMembershipId(scopeOwnerMembershipId);
    setPendingStatus(scopeStatus);
    setPageSearchQuery("");
  }, [scopeSourceIds, scopeVerifiedOnly, scopePageIds, scopeSpaceId, scopeOwnerMembershipId, scopeStatus]);

  const applyScopePending = useCallback(() => {
    setScopeSourceIds(pendingScopeIds);
    setScopeVerifiedOnly(pendingVerifiedOnly);
    setScopePageIds(pendingPageIds);
    setScopeSpaceId(pendingSpaceId);
    setScopeOwnerMembershipId(pendingOwnerMembershipId);
    setScopeStatus(pendingStatus);
  }, [
    pendingScopeIds,
    pendingVerifiedOnly,
    pendingPageIds,
    pendingSpaceId,
    pendingOwnerMembershipId,
    pendingStatus,
  ]);

  const clearScope = useCallback(() => {
    setScopeSourceIds([]);
    setScopeVerifiedOnly(false);
    setScopePageIds([]);
    setScopeSpaceId(null);
    setScopeOwnerMembershipId(null);
    setScopeStatus(null);
  }, []);

  function handleOwnersLoadMore() {
    void ownersQuery.fetchNextPage();
  }

  function handleOwnersRetry() {
    void ownersQuery.refetch();
  }

  function handleScopeSelectionChange(ids: number[]) {
    setPendingScopeIds(ids);
  }

  function handleScopeVerifiedOnlyChange(v: boolean) {
    setPendingVerifiedOnly(v);
  }

  return {
    scopeSourceIds,
    scopeVerifiedOnly,
    scopePageIds,
    scopeSpaceId,
    scopeOwnerMembershipId,
    scopeStatus,
    scopeActive,
    scopeItemCount,
    scopeSummary,
    scopePayload,
    pendingScopeIds,
    pendingVerifiedOnly,
    pendingPageIds,
    pendingSpaceId,
    setPendingSpaceId,
    pendingOwnerMembershipId,
    setPendingOwnerMembershipId,
    pendingStatus,
    setPendingStatus,
    scopeKindFilter,
    setScopeKindFilter,
    scopeOwnerFilter,
    setScopeOwnerFilter,
    setPendingPageIds,
    scopeDisplaySources,
    activeScopeSourcesQuery,
    scopeOwners,
    selectedScopeOwner,
    setOwnerSearch,
    ownersQuery,
    kbSpaces,
    pageSearchQuery,
    setPageSearchQuery,
    pageSearchResults,
    pageSearchIsLoading,
    onScopeSheetOpen,
    applyScopePending,
    clearScope,
    handleOwnersLoadMore,
    handleOwnersRetry,
    handleScopeSelectionChange,
    handleScopeVerifiedOnlyChange,
  };
}
