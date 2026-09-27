"use client";

import { useState, useCallback, useRef } from "react";
import { useModulePages } from "@/hooks/api/build/advanced";
import { useDeleteModule } from "@/hooks/api/build/modules";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardSkeleton } from "@/features/build/modules/module-card";
import { ModuleFormSheet } from "@/features/build/modules/module-form-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, Package, Activity, CheckCircle2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  CONTENT_FILL_PANEL,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import { useCan } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import type { Module } from "@/types/projects/projects";

function NewModuleButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" />
      New Module
    </Button>
  );
}

interface ModulesPageProps {
  projectId: number;
}

export function ModulesPage({ projectId }: ModulesPageProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editModule, setEditModule] = useState<Module | null>(null);
  const [deleteModule, setDeleteModule] = useState<Module | null>(null);
  const canManage = useCan("build:workspace:manage");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listFilters = useBuildListFilters();
  const deleteMutation = useDeleteModule();

  const {
    data: modulePages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useModulePages(projectId);

  const pageState = usePageState({ isLoading, isError, error, permission: "build:view" });
  const allModules = modulePages?.pages.flatMap((page) => page.data) ?? [];
  const q = listFilters.debouncedSearch.toLowerCase();
  const statusFilter = listFilters.value("status");
  const leadFilter = listFilters.value("leadId");
  const modules = allModules.filter(
    (m) =>
      (!q || m.name.toLowerCase().includes(q)) &&
      (!statusFilter || statusFilter === "all" || m.status === statusFilter) &&
      (!leadFilter || leadFilter === "all" || m.leadId === leadFilter),
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleEditModule = useCallback((mod: Module) => setEditModule(mod), []);
  const handleDeleteModule = useCallback((mod: Module) => setDeleteModule(mod), []);
  const handleEditOpenChange = useCallback(
    (open: boolean) => { if (!open) setEditModule(null); },
    [],
  );
  const handleDeleteOpenChange = useCallback(
    (open: boolean) => { if (!open) setDeleteModule(null); },
    [],
  );
  const handleConfirmDelete = useCallback(() => {
    if (!deleteModule) return;
    deleteMutation.mutate(
      { projectId, moduleId: deleteModule.id },
      {
        onSuccess: () => {
          setDeleteModule(null);
          toast.success("Module deleted");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [deleteMutation, deleteModule, projectId]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleClearModulesKeyboard = useCallback(() => {}, []);
  const handleOpenModuleByIndex = useCallback((_index: number) => {}, []);
  useBuildListKeyboard({
    itemCount: modules.length,
    onOpen: handleOpenModuleByIndex,
    onClearSelection: handleClearModulesKeyboard,
    enabled: pageState.kind === "ready",
    searchInputRef,
  });

  const total = modules?.length ?? 0;
  const inProgress = modules?.filter((m) => m.status === "in-progress").length ?? 0;
  const completed = modules?.filter((m) => m.status === "completed").length ?? 0;
  const planned = modules?.filter((m) => m.status === "planned").length ?? 0;

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper
        title="Modules"
        subtitle="Organize work into feature groups and track module progress"
      >
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper
        title="Modules"
        subtitle="Organize work into feature groups and track module progress"
      >
        <PmPageShell>
          <PmSection index={0}>
            <StatCardGridSkeleton cols={4} count={4} />
          </PmSection>
          <PmSection index={1}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ModuleCardSkeleton key={i} />
              ))}
            </div>
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <>
    <PageWrapper
      title="Modules"
      subtitle="Organize work into feature groups and track module progress"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search modules",
            inputRef: searchInputRef,
          }}
          onClearAll={listFilters.clearAll}
        />
      }
      actions={
        canManage ? <NewModuleButton onClick={handleOpenCreate} /> : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGrid cols={4}>
            <StatCard label="Total" value={total} icon={Package} tone="default" />
            <StatCard label="In Progress" value={inProgress} icon={Activity} tone="default" />
            <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Planned" value={planned} icon={Calendar} tone="amber" />
          </StatCardGrid>
        </PmSection>

        {!modules?.length ? (
          <PmSection index={1} className={PM_FILL_SECTION}>
            <EmptyState
              illustration={<EmptyTasksIllustration />}
              title="No modules yet"
              description="Create your first module to organize work into feature areas."
              action={canManage ? { label: "Create First Module", onClick: handleOpenCreate } : undefined}
              className={CONTENT_FILL_PANEL}
            />
          </PmSection>
        ) : (
          <PmSection index={1}>
            <PmStaggerList className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((mod, index) => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  projectId={projectId}
                  index={index}
                  onEdit={canManage ? handleEditModule : undefined}
                  onDelete={canManage ? handleDeleteModule : undefined}
                />
              ))}
            </PmStaggerList>
            <InfiniteScrollSentinel
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={handleLoadMore}
              label="Load more modules"
            />
          </PmSection>
        )}
      </PmPageShell>
    </PageWrapper>

    <ModuleFormSheet
      mode="create"
      projectId={projectId}
      open={createOpen}
      onOpenChange={setCreateOpen}
    />

    {editModule && (
      <ModuleFormSheet
        mode="edit"
        projectId={projectId}
        module={editModule}
        open={!!editModule}
        onOpenChange={handleEditOpenChange}
      />
    )}

    <ConfirmDialog
      open={!!deleteModule}
      onOpenChange={handleDeleteOpenChange}
      title={`Delete "${deleteModule?.name ?? "module"}"?`}
      description="This action cannot be undone. All module work items will be unlinked."
      confirmLabel="Delete"
      destructive
      isPending={deleteMutation.isPending}
      onConfirm={handleConfirmDelete}
    />
  </>
  );
}
