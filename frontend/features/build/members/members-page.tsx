"use client";

import {
  useState,
  useCallback,
  useTransition,
  useEffect,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { SearchInput } from "@/components/ui/search-input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useProjectWorkspaceMembers,
  useRemoveProjectWorkspaceMember,
} from "@/hooks/api/build/workspace-members";
import type { ProjectWorkspaceMember } from "@/hooks/api/build/workspace-members";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getUserDisplayName } from "@/lib/person-display";
import { PmAccessButton } from "@/features/build/members/pm-access-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { type DisplayProps, loadDisplayProps, saveDisplayProps } from "./display-props";
import { DisplayPropsToggle, AddMemberButton } from "./members-toolbar";
import { AddMemberDialog } from "./add-member-dialog";
import { useMembersColumns } from "./use-members-columns";

export function MembersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(q);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [displayProps, setDisplayProps] = useState<DisplayProps>(loadDisplayProps);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ProjectWorkspaceMember | null>(null);

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const removeConfirmOpen = removeTarget !== null;

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    if (debouncedSearch === (q || "")) return;
    pushParams({ search: debouncedSearch || null });
    setCursor(undefined);
    setCursorStack([]);
  }, [debouncedSearch, q, pushParams]);

  const handleSearchChange = useCallback((value: string) => setSearch(value), []);

  const filtersActive = search.trim() !== "";

  const handleClearFilters = useCallback(() => setSearch(""), []);

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
    setCursor(prevCursor === "" ? undefined : prevCursor);
  }

  const canView = useCan("build:members:view");
  const canManage = useCan("build:members:manage");

  const { data, isLoading, isError, error, refetch } = useProjectWorkspaceMembers(
    { cursor, limit: 25, search: q || undefined },
    { placeholderData: keepPreviousData },
  );

  const removeMember = useRemoveProjectWorkspaceMember();

  const handleRetry = useCallback(() => {
    void refetch().catch(() => {
      toast.error(getErrorMessage(error));
    });
  }, [refetch, error]);

  const handleRemoveRequest = useCallback((member: ProjectWorkspaceMember) => {
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

  const members = data?.data ?? [];
  const hasPrev = cursorStack.length > 0;
  const hasNext = !!data?.pagination.hasMore;

  const columns = useMembersColumns({ displayProps, canManage, handleRemoveRequest });

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
        {!canView ? (
          <EmptyState
            illustrationPreset="team"
            title="Access restricted"
            description="You don't have permission to view workspace members."
          />
        ) : isError ? (
          <ErrorState
            title="Failed to load members"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <>
            <DataTable
              className="flex-1 min-h-0"
              data={members}
              columns={columns}
              getRowKey={(member) => member.id}
              isLoading={isLoading}
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
        )}
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
