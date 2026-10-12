"use client";

import { useCallback, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { useGoals } from "@/hooks/api/goals";
import { useInfiniteManagedProductReleases } from "@/hooks/api/build/managed-product-releases";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useState } from "react";
import type { AcceptOpportunityInput } from "@/hooks/api/build/opportunity-mutations";
import { acceptSchema, type AcceptFormValues } from "./opportunity-accept-schema";
import {
  AcceptFields,
  type NamedItem,
  type Release,
  type TitledItem,
  type SelectorProps,
} from "./opportunity-accept-fields";
import { useInfiniteSelectorProjects } from "./use-infinite-selector";
import { IntersectSentinel } from "./intersect-sentinel";

interface OpportunityAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityTitle: string;
  expectedVersion: number;
  managedProductId: number;
  isSubmitting: boolean;
  onAccept: (data: AcceptOpportunityInput) => void;
}

export function OpportunityAcceptDialog({
  open,
  onOpenChange,
  opportunityTitle,
  expectedVersion,
  managedProductId,
  isSubmitting,
  onAccept,
}: OpportunityAcceptDialogProps) {
  const [goalsSearch, setGoalsSearch] = useState("");
  const [projectsSearch, setProjectsSearch] = useState("");
  const debouncedGoalsSearch = useDebouncedValue(goalsSearch, 300);
  const debouncedProjectsSearch = useDebouncedValue(projectsSearch, 300);

  const {
    data: goalsRaw,
    isError: isGoalsError,
    error: goalsError,
    refetch: refetchGoals,
  } = useGoals({ managedProductId, search: debouncedGoalsSearch || undefined });

  const {
    data: projectsPages,
    isError: isProjectsError,
    error: projectsError,
    refetch: refetchProjects,
    fetchNextPage: fetchProjectsNextPage,
    hasNextPage: hasProjectsNextPage,
    isFetchingNextPage: isFetchingProjectsNextPage,
  } = useInfiniteSelectorProjects(managedProductId, debouncedProjectsSearch, open);

  const {
    data: releasesPages,
    isError: isReleasesError,
    error: releasesError,
    refetch: refetchReleases,
    fetchNextPage: fetchReleasesNextPage,
    hasNextPage: hasReleasesNextPage,
    isFetchingNextPage: isFetchingReleasesNextPage,
  } = useInfiniteManagedProductReleases(managedProductId, { limit: 25 });

  const goals = useMemo<TitledItem[]>(() => goalsRaw ?? [], [goalsRaw]);
  const projectItems = useMemo<NamedItem[]>(
    () => projectsPages?.pages.flatMap((p) => p.data) ?? [],
    [projectsPages],
  );
  const releaseItems = useMemo<Release[]>(
    () => releasesPages?.pages.flatMap((p) => p.data) ?? [],
    [releasesPages],
  );

  const handleGoalsSearch = useCallback((v: string) => setGoalsSearch(v), []);
  const handleProjectsSearch = useCallback((v: string) => setProjectsSearch(v), []);
  const handleFetchProjectsNext = useCallback(() => {
    if (hasProjectsNextPage && !isFetchingProjectsNextPage) void fetchProjectsNextPage();
  }, [fetchProjectsNextPage, hasProjectsNextPage, isFetchingProjectsNextPage]);
  const handleFetchReleasesNext = useCallback(() => {
    if (hasReleasesNextPage && !isFetchingReleasesNextPage) void fetchReleasesNextPage();
  }, [fetchReleasesNextPage, hasReleasesNextPage, isFetchingReleasesNextPage]);
  const handleRetryGoals = useCallback(() => void refetchGoals(), [refetchGoals]);
  const handleRetryProjects = useCallback(() => void refetchProjects(), [refetchProjects]);
  const handleRetryReleases = useCallback(() => void refetchReleases(), [refetchReleases]);

  const goalsSelectorProps: SelectorProps<TitledItem> = {
    items: goals,
    isError: isGoalsError,
    error: goalsError,
    onRetry: handleRetryGoals,
    onSearchChange: handleGoalsSearch,
  };

  const projectsSelectorProps: SelectorProps<NamedItem> = {
    items: projectItems,
    isError: isProjectsError,
    error: projectsError,
    onRetry: handleRetryProjects,
    onSearchChange: handleProjectsSearch,
    footer: hasProjectsNextPage ? (
      <IntersectSentinel onVisible={handleFetchProjectsNext} />
    ) : undefined,
  };

  const releasesSelectorProps: SelectorProps<Release> = {
    items: releaseItems,
    isError: isReleasesError,
    error: releasesError,
    onRetry: handleRetryReleases,
    footer: hasReleasesNextPage ? (
      <IntersectSentinel onVisible={handleFetchReleasesNext} />
    ) : undefined,
  };

  return (
    <EntityFormSheet<AcceptFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Accept opportunity"
      description={`Accepting "${opportunityTitle}" will create a linked roadmap initiative.`}
      resolver={zodResolver(acceptSchema)}
      defaultValues={{ horizon: "next", expectedVersion, isPublic: false }}
      onSubmit={onAccept}
      isSubmitting={isSubmitting}
      submitLabel="Accept"
      resetOnOpen
    >
      {(form) => (
        <AcceptFields
          form={form}
          managedProductId={managedProductId}
          enabled={open}
          goals={goalsSelectorProps}
          projects={projectsSelectorProps}
          releases={releasesSelectorProps}
        />
      )}
    </EntityFormSheet>
  );
}
