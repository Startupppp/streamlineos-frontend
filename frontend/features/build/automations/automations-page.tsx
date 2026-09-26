"use client";

import { useState, useCallback, useRef } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGrid, StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AutomationsIllustration } from "@/components/illustrations";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import {
  useAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  TRIGGER_EVENTS,
  type ProjectAutomation,
} from "@/hooks/api/build/automations";
import {
  useBuildListFilters,
  BUILD_FILTER_ALL,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { formSchema, type FormValues } from "./automation-schema";
import { AutomationCard } from "./automation-card";
import { NewAutomationButton } from "./new-automation-button";
import { AutomationSheet } from "./automation-sheet";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";

const TRIGGER_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All triggers" },
  ...TRIGGER_EVENTS.map((t) => ({ value: t.value, label: t.label })),
];

const FILTER_DEFINITIONS = [
  { param: "trigger", options: TRIGGER_EVENTS.map((t) => t.value) },
] as const;

interface AutomationsPageProps {
  projectId: number;
}

export function AutomationsPage({ projectId }: AutomationsPageProps) {
  const canManage = useCan("build:manage");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<ProjectAutomation | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const listFilters = useBuildListFilters({
    filters: FILTER_DEFINITIONS,
    withSearch: true,
  });

  const { data: automations = [], isLoading, isError, error, refetch } = useAutomations(projectId);

  const filteredAutomations = automations.filter((automation) => {
    const q = listFilters.debouncedSearch.toLowerCase();
    if (q.length > 0 && !automation.name.toLowerCase().includes(q)) return false;
    const triggerFilter = listFilters.value("trigger");
    if (triggerFilter !== BUILD_FILTER_ALL && automation.triggerEvent !== triggerFilter) return false;
    return true;
  });

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: filteredAutomations.length === 0,
  });

  const createAutomation = useCreateAutomation(projectId);
  const updateAutomation = useUpdateAutomation(projectId);
  const deleteAutomation = useDeleteAutomation(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      triggerEvent: "",
      conditions: [],
      actions: [{ type: "set_status", value: "" }],
      isActive: true,
    },
  });
  useRegisterDirtyState(sheetOpen && form.formState.isDirty);

  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({ control: form.control, name: "conditions" });

  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({ control: form.control, name: "actions" });

  const handleEdit = useCallback(
    (automation: ProjectAutomation) => {
      setEditingAutomation(automation);
      form.reset({
        name: automation.name,
        triggerEvent: automation.triggerEvent,
        conditions: automation.conditions,
        actions: automation.actions,
        isActive: automation.isActive,
      });
      setSheetOpen(true);
    },
    [form],
  );

  const handleOpenNew = useCallback(() => {
    setEditingAutomation(null);
    form.reset({
      name: "",
      triggerEvent: "",
      conditions: [],
      actions: [{ type: "set_status", value: "" }],
      isActive: true,
    });
    setSheetOpen(true);
  }, [form]);

  const handleToggle = useCallback(
    (automationId: number, isActive: boolean) => {
      updateAutomation.mutate(
        { automationId, isActive },
        { onError: (e) => toast.error(getErrorMessage(e)) },
      );
    },
    [updateAutomation],
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteAutomation.mutate(id, {
        onSuccess: () => toast.success("Automation deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteAutomation],
  );

  const handleSubmit = useCallback(
    (values: FormValues) => {
      if (editingAutomation) {
        updateAutomation.mutate(
          { automationId: editingAutomation.id, ...values },
          {
            onSuccess: () => {
              setSheetOpen(false);
              toast.success("Automation updated");
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        createAutomation.mutate(values, {
          onSuccess: () => {
            setSheetOpen(false);
            toast.success("Automation created");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      }
    },
    [editingAutomation, createAutomation, updateAutomation],
  );

  const handleCloseSheet = useCallback(() => setSheetOpen(false), []);
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const handleAppendCondition = useCallback(() => {
    appendCondition({ field: "status", operator: "equals", value: "" });
  }, [appendCondition]);

  const handleAppendAction = useCallback(() => {
    appendAction({ type: "set_status", value: "" });
  }, [appendAction]);

  const handleClearFilters = useCallback(() => listFilters.clearAll(), [listFilters]);
  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  const handleKeyboardOpen = useCallback(
    (index: number) => {
      const automation = filteredAutomations[index];
      if (automation) handleEdit(automation);
    },
    [filteredAutomations, handleEdit],
  );

  const handleKeyboardEdit = useCallback(
    (index: number) => {
      const automation = filteredAutomations[index];
      if (automation) handleEdit(automation);
    },
    [filteredAutomations, handleEdit],
  );

  const handleKeyboardClear = useCallback(() => undefined, []);

  const keyboard = useBuildListKeyboard({
    itemCount: filteredAutomations.length,
    onOpen: handleKeyboardOpen,
    onEdit: handleKeyboardEdit,
    onCreate: canManage ? handleOpenNew : undefined,
    onClearSelection: handleKeyboardClear,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef,
    enabled: !sheetOpen,
  });

  const handleTriggerFilterChange = useCallback(
    (v: string) => listFilters.setValue("trigger", v),
    [listFilters],
  );

  const isFiltered = listFilters.isFiltered;

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
        className={PM_FILL_PANEL}
        illustration={<AutomationsIllustration className="h-32 w-32" />}
        title={isFiltered ? "No automations match your filters" : "No automations yet"}
        description={
          isFiltered
            ? "Try adjusting your search or filter to find what you're looking for."
            : "Automate repetitive work — assign tickets, change statuses, and more with if-then rules."
        }
        action={
          isFiltered
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
      actions={canManage ? <NewAutomationButton onClick={handleOpenNew} /> : undefined}
    >
      <PmPageShell>
        <PageState
          resolution={pageState}
          loading={loadingContent}
          empty={emptyContent}
          onRetry={handleRetry}
        >
          <PmSection index={0} className="shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <SearchInput
                ref={searchInputRef}
                value={listFilters.search}
                onValueChange={listFilters.setSearch}
                placeholder="Search automations…"
                className="flex-1 h-8 text-sm"
                aria-label="Search automations"
              />
              <Select
                value={listFilters.value("trigger")}
                onValueChange={handleTriggerFilterChange}
              >
                <SelectTrigger className="h-8 w-44 text-sm" aria-label="Filter by trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PmSection>

          <PmSection index={1} className="shrink-0">
            <StatCardGrid cols={2} className="mb-1">
              <StatCard
                label="Active"
                value={automations.filter((a) => a.isActive).length}
                icon={Zap}
                tone="emerald"
              />
              <StatCard
                label="Inactive"
                value={automations.filter((a) => !a.isActive).length}
                icon={Zap}
                tone="default"
              />
            </StatCardGrid>
          </PmSection>

          <PmSection index={2} className="flex min-h-0 flex-1 flex-col">
            <PmStaggerList className="space-y-2.5" role="list" aria-label="Automations">
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

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </PageWrapper>
  );
}
