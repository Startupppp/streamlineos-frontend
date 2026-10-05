"use client";

import { AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGrid, StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AutomationsIllustration } from "@/components/illustrations";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { PageState } from "@/components/shared/page-state";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { AutomationCard } from "./automation-card";
import { NewAutomationButton } from "./new-automation-button";
import { AutomationSheet } from "./automation-sheet";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import {
  TRIGGER_FILTER_OPTIONS,
  ACTION_FILTER_OPTIONS,
  useAutomationsPage,
} from "./use-automations-page";

interface AutomationsPageProps {
  projectId: number;
}

export function AutomationsPage({ projectId }: AutomationsPageProps) {
  const {
    canManage,
    isOnline,
    sheetOpen,
    setSheetOpen,
    editingAutomation,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    searchInputRef,
    listFilters,
    filteredAutomations,
    allAutomations,
    pageState,
    form,
    conditionFields,
    actionFields,
    removeCondition,
    removeAction,
    keyboard,
    isFiltered,
    hasNextPage,
    isFetchingNextPage,
    createAutomation,
    updateAutomation,
    handleEdit,
    handleOpenNew,
    handleToggle,
    handleDelete,
    handleSubmit,
    handleCloseSheet,
    handleRetry,
    handleLoadMore,
    handleAppendCondition,
    handleAppendAction,
    handleClearFilters,
    handleTriggerFilterChange,
    handleActionFilterChange,
  } = useAutomationsPage(projectId);

  const loadingContent = (
    <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </PmSection>
  );

  const emptyContent = (
    <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
      <EmptyState
        className={CONTENT_FILL_PANEL}
        illustration={<AutomationsIllustration className="h-32 w-32" />}
        title={
          !isOnline
            ? "You are offline"
            : isFiltered
              ? "No automations match your filters"
              : "No automations yet"
        }
        description={
          !isOnline
            ? "Reconnect to see your automations."
            : isFiltered
              ? "Try adjusting your search or filter to find what you're looking for."
              : "Automate repetitive work — assign tickets, change statuses, and more with if-then rules."
        }
        action={
          !isOnline
            ? undefined
            : isFiltered
              ? { label: "Clear filters", onClick: handleClearFilters }
              : canManage
                ? { label: "Create Automation", onClick: handleOpenNew }
                : undefined
        }
      />
    </PmSection>
  );

  return (
    <PageWrapper
      title="Automations"
      subtitle="Automate repetitive actions with if-then rules"
      actions={
        canManage ? <NewAutomationButton onClick={handleOpenNew} /> : undefined
      }
    >
      <PmPageShell>
        <PageState
          resolution={pageState}
          loading={loadingContent}
          empty={emptyContent}
          onRetry={handleRetry}
        >
          <PmSection index={0} className="shrink-0">
            <BuildListToolbar
              className="mb-3"
              search={{
                value: listFilters.search,
                onValueChange: listFilters.setSearch,
                placeholder: "Search automations…",
                label: "Search automations",
                inputRef: searchInputRef,
              }}
              filters={[
                {
                  id: "trigger",
                  label: "Trigger",
                  active: listFilters.isActive("trigger"),
                  control: (
                    <BuildFilterSelect
                      label="Filter by trigger"
                      value={listFilters.value("trigger")}
                      onValueChange={handleTriggerFilterChange}
                      options={TRIGGER_FILTER_OPTIONS}
                    />
                  ),
                },
                {
                  id: "action",
                  label: "Action",
                  active: listFilters.isActive("action"),
                  control: (
                    <BuildFilterSelect
                      label="Filter by action"
                      value={listFilters.value("action")}
                      onValueChange={handleActionFilterChange}
                      options={ACTION_FILTER_OPTIONS}
                    />
                  ),
                },
              ]}
              onClearAll={listFilters.clearAll}
            />
          </PmSection>

          <PmSection index={1} className="shrink-0">
            <StatCardGrid cols={2} className="mb-1">
              <StatCard
                label="Active"
                value={allAutomations.filter((a) => a.isActive).length}
                icon={Zap}
                tone="emerald"
              />
              <StatCard
                label="Inactive"
                value={allAutomations.filter((a) => !a.isActive).length}
                icon={Zap}
                tone="default"
              />
            </StatCardGrid>
          </PmSection>

          <PmSection index={2} className="flex min-h-0 flex-1 flex-col">
            <PmStaggerList
              className="space-y-2.5"
              role="list"
              aria-label="Automations"
            >
              <AnimatePresence initial={false}>
                {filteredAutomations.map((auto, idx) => (
                  <div
                    key={auto.id}
                    role="listitem"
                    className={
                      keyboard.focusedIndex === idx
                        ? "rounded-xl ring-2 ring-primary/50"
                        : undefined
                    }
                  >
                    <AutomationCard
                      automation={auto}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      canManage={canManage}
                    />
                  </div>
                ))}
              </AnimatePresence>
            </PmStaggerList>
            <InfiniteScrollSentinel
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={handleLoadMore}
              label="Load more automations"
            />
          </PmSection>
        </PageState>
      </PmPageShell>

      <AutomationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editingAutomation={editingAutomation}
        form={form}
        conditionFields={conditionFields}
        actionFields={actionFields}
        onAppendCondition={handleAppendCondition}
        onRemoveCondition={removeCondition}
        onAppendAction={handleAppendAction}
        onRemoveAction={removeAction}
        onSubmit={handleSubmit}
        onClose={handleCloseSheet}
        projectId={projectId}
        createIsPending={createAutomation.isPending}
        updateIsPending={updateAutomation.isPending}
      />

      <ShortcutHelpDialog
        open={shortcutHelpOpen}
        onOpenChange={setShortcutHelpOpen}
      />
    </PageWrapper>
  );
}
