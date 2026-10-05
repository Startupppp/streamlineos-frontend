import { useState, useCallback, useRef, useMemo } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  TRIGGER_EVENTS,
  ACTION_TYPES,
} from "@/hooks/api/build/automations";
import type { ProjectAutomation, AutomationActionType } from "@/types/projects";
import {
  useBuildListFilters,
  BUILD_FILTER_ALL,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { formSchema, type FormValues } from "./automation-schema";

export const TRIGGER_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All triggers" },
  ...TRIGGER_EVENTS.map((t) => ({ value: t.value, label: t.label })),
];

export const ACTION_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All actions" },
  ...ACTION_TYPES.map((a) => ({ value: a.value, label: a.label })),
];

const FILTER_DEFINITIONS = [
  { param: "trigger", options: TRIGGER_EVENTS.map((t) => t.value) },
  { param: "action", options: ACTION_TYPES.map((a) => a.value) },
] as const;

export function useAutomationsPage(projectId: number) {
  const canManage = useCan("build:manage");
  const isOnline = useOnlineStatus();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] =
    useState<ProjectAutomation | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const listFilters = useBuildListFilters({
    filters: FILTER_DEFINITIONS,
    withSearch: true,
  });

  const serverAction = listFilters.value("action");
  const resolvedAction: AutomationActionType | undefined = (() => {
    if (serverAction === BUILD_FILTER_ALL) return undefined;
    const match = ACTION_TYPES.find((a) => a.value === serverAction);
    return match ? match.value : undefined;
  })();
  const serverFilters = {
    action: resolvedAction,
    search: listFilters.debouncedSearch || undefined,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAutomations(projectId, serverFilters);

  const allAutomations = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const filteredAutomations = allAutomations.filter((automation) => {
    const triggerFilter = listFilters.value("trigger");
    if (
      triggerFilter !== BUILD_FILTER_ALL &&
      automation.triggerEvent !== triggerFilter
    )
      return false;
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
      triggerEvent: "ticket.created",
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
        triggerEvent:
          formSchema.shape.triggerEvent.options.find(
            (e) => e === automation.triggerEvent,
          ) ?? "ticket.created",
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
      triggerEvent: "ticket.created",
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
  const handleLoadMore = useCallback(
    () => void fetchNextPage(),
    [fetchNextPage],
  );

  const handleAppendCondition = useCallback(() => {
    appendCondition({ field: "status", operator: "equals", value: "" });
  }, [appendCondition]);

  const handleAppendAction = useCallback(() => {
    appendAction({ type: "set_status", value: "" });
  }, [appendAction]);

  const handleClearFilters = useCallback(
    () => listFilters.clearAll(),
    [listFilters],
  );

  const handleShortcutHelp = useCallback(
    () => setShortcutHelpOpen(true),
    [],
  );

  const handleKeyboardByIndex = useCallback(
    (index: number) => {
      const automation = filteredAutomations[index];
      if (automation) handleEdit(automation);
    },
    [filteredAutomations, handleEdit],
  );

  const keyboard = useBuildListKeyboard({
    itemCount: filteredAutomations.length,
    onOpen: handleKeyboardByIndex,
    onEdit: handleKeyboardByIndex,
    onCreate: canManage ? handleOpenNew : undefined,
    onClearSelection: useCallback(() => undefined, []),
    onShortcutHelp: handleShortcutHelp,
    searchInputRef,
    enabled: !sheetOpen,
  });

  const handleTriggerFilterChange = useCallback(
    (v: string) => listFilters.setValue("trigger", v),
    [listFilters],
  );

  const handleActionFilterChange = useCallback(
    (v: string) => listFilters.setValue("action", v),
    [listFilters],
  );

  return {
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
    isFiltered: listFilters.isFiltered,
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
  };
}
