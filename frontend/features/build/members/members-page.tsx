"use client";

import {
  useState,
  useCallback,
  useEffect,
} from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { SearchInput } from "@/components/ui/search-input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useBuildMembers,
  useRemoveBuildMember,
} from "@/hooks/api/build/build-members";
import type { BuildMember } from "@/hooks/api/build/build-members";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getUserDisplayName } from "@/lib/person-display";
import { PmAccessButton } from "@/features/build/members/pm-access-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { type DisplayProps, loadDisplayProps, saveDisplayProps } from "./display-props";
import { DisplayPropsToggle, AddMemberButton } from "./members-toolbar";
import { AddMemberDialog } from "./add-member-dialog";
import { useMembersColumns } from "./use-members-columns";
import { useBuildListUrlState } from "@/features/build/shared/use-build-list-url-state";

export function MembersPage() {
  const searchParams = useSearchParams();
  const { cursor, setCursor, setListParams } = useBuildListUrlState();

  const urlQ = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(urlQ);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [displayProps, setDisplayProps] = useState<DisplayProps>(loadDisplayProps);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<BuildMember | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const removeConfirmOpen = removeTarget !== null;

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    setListParams({ q: debouncedSearch || null });
  }, [debouncedSearch, searchParams, setListParams]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCursorStack([]);
  }, []);

  const filtersActive = search.trim() !== "";

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setListParams({ q: null });
    setCursorStack([]);
  }, [setListParams]);

  const handleOpenAddDialog = useCallback(() => setAddDialogOpen(true), []);

  const handleDisplayChange = useCallback((next: DisplayProps) => {
    setDisplayProps(next);
    saveDisplayProps(next);
  }, []);

  function handleNextPage() {
    const nextCursor = data?.pagination.nextCursor;
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, cursor ?? ""]);
    setCursor(nextCursor);
  }

  function handlePrevPage() {
    const prevCursor = cursorStack[cursorStack.length - 1];
    setCursorStack((prev) => prev.slice(0, -1));
    setCursor(prevCursor === "" ? null : prevCursor);
  }

  const canView = useCan("build:members:view");
  const canManage = useCan("build:members:manage");

  const { data, isLoading, isError, error, refetch } = useBuildMembers(
    { cursor: cursor ?? undefined, limit: 25, search: urlQ || undefined },
    { placeholderData: keepPreviousData, enabled: canView },
  );

  const pageState = usePageState({ permission: "build:members:view", isLoading, isError, error });

  const removeMember = useRemoveBuildMember();

  const handleRetry = useCallback(() => {
    void refetch().catch(() => {
      toast.error(getErrorMessage(error));
    });
  }, [refetch, error]);

  const handleRemoveRequest = useCallback((member: BuildMember) => {
    setRemoveTarget(member);
  }, []);

  const handleRemoveConfirmOpenChange = useCallback((open: boolean) => {
    if (!open) setRemoveTarget(null);
  }, []);

  const handleRemoveConfirm = useCallback(() => {
    if (!removeTarget) return;
    const targetId = removeTarget.id;
    const targetName = getUserDisplayName(removeTarget);
    removeMember.mutate(targetId, {
      onSuccess: () => {
        toast.success(`${targetName} removed from workspace.`);
        setRemoveTarget(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }, [removeTarget, removeMember]);

  const columns = useMembersColumns({ displayProps, canManage, handleRemoveRequest });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Members" subtitle="People who can access Build, and their roles.">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  const members = data?.data ?? [];
  const hasPrev = cursorStack.length > 0;
  const hasNext = !!data?.pagination.hasMore;

  return (
    <>
      <PageWrapper
        title="Members"
        subtitle="People who can access Build, and their roles."
        noInternalScroll
        filtersClassName="flex-col items-stretch gap-2 overflow-x-visible"
        filters={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2 sm:overflow-x-auto sm:overscroll-x-contain sm:scrollbar-hide sm:touch-pan-x">
            <div className="flex w-full min-w-0 items-center gap-1.5 sm:contents">
              <div className="shrink-0 sm:order-2">
                <DisplayPropsToggle value={displayProps} onChange={handleDisplayChange} />
              </div>
              {canManage ? (
                <div className="shrink-0 sm:order-3">
                  <PmAccessButton />
                </div>
              ) : null}
              {canManage ? (
                <div className="ml-auto shrink-0 sm:order-4 sm:ml-0">
                  <AddMemberButton onClick={handleOpenAddDialog} />
                </div>
              ) : null}
            </div>
            <div className="flex w-full min-w-0 items-center gap-1.5 sm:contents">
              <SearchInput
                placeholder="Search members…"
                value={search}
                onValueChange={handleSearchChange}
                aria-label="Search members"
                className="h-9"
                inputClassName="h-9 min-h-9"
              />
            </div>
          </div>
        }
      >
        <>
            <DataTable
              className="flex-1 min-h-0"
              data={members}
              columns={columns}
              getRowKey={(member) => member.id}
              isLoading={isLoading || pageState.kind === "loading"}
              emptyState={
                <EmptyState
                  illustrationPreset="team"
                  title="No members yet"
                  description={
                    filtersActive
                      ? undefined
                      : canManage
                        ? "Add the first person who should have access to Build."
                        : "People with access to Build will appear here."
                  }
                  filtersActive={filtersActive}
                  onClearFilters={handleClearFilters}
                  action={
                    !filtersActive && canManage
                      ? { label: "Add member", onClick: handleOpenAddDialog }
                      : undefined
                  }
                />
              }
              minWidth="640px"
            />
            {(hasPrev || hasNext) ? (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t px-2 py-2">
                <Button variant="outline" size="sm" disabled={!hasPrev} onClick={handlePrevPage}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={!hasNext} onClick={handleNextPage}>
                  Next
                </Button>
              </div>
            ) : null}
          </>
      </PageWrapper>

      <AddMemberDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={handleRemoveConfirmOpenChange}
        title="Remove member?"
        description={
          removeTarget
            ? `${getUserDisplayName(removeTarget)} will lose access to Build. They stay a member of your organization.`
            : "This person will lose access to Build. They stay a member of your organization."
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        isPending={removeMember.isPending}
        onConfirm={handleRemoveConfirm}
      />
    </>
  );
}
