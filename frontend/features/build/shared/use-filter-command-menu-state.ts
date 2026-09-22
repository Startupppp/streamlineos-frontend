"use client";

import {
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { useReducedMotion } from "framer-motion";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { useHorizontalSwipe } from "@/hooks/common/use-horizontal-swipe";
import {
  categoryTitle,
  type FilterCategory,
  type StatusFilterOption,
  type Member,
  type Label,
  type Cycle,
  type ProjectOption,
  type FilterState,
  type CategoryDefinition,
} from "@/components/list-view";
import type { StatusConfigEntry } from "@/lib/status-config";

interface UseFilterCommandMenuStateParams {
  defaultOpen?: boolean;
  assigneeLeading?: ReactNode;
  statusItems: StatusFilterOption[];
  statusConfig: Record<string, StatusConfigEntry>;
  members: Member[];
  labels: Label[];
  cycles: Cycle[];
  projectOptions?: ProjectOption[];
  showTypeFilter: boolean;
  showAssigneeFilter: boolean;
  filterState: Omit<FilterState, "sprintParam">;
  onToggleStatus: (value: string) => void;
  onTogglePriority: (value: string) => void;
  onToggleType: (value: string) => void;
  onToggleAssignee: (value: string) => void;
  onToggleLabel: (value: string) => void;
  onToggleCycle: (value: string) => void;
  onToggleProject: (value: string) => void;
  onDueDateFromChange: (value: string) => void;
  onDueDateToChange: (value: string) => void;
}

export function useFilterCommandMenuState({
  defaultOpen,
  assigneeLeading,
  statusItems,
  statusConfig,
  members,
  labels,
  cycles,
  projectOptions,
  showTypeFilter,
  showAssigneeFilter,
  filterState,
  onToggleStatus,
  onTogglePriority,
  onToggleType,
  onToggleAssignee,
  onToggleLabel,
  onToggleCycle,
  onToggleProject,
  onDueDateFromChange,
  onDueDateToChange,
}: UseFilterCommandMenuStateParams) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FilterCategory | null>(null);
  const [navDirection, setNavDirection] = useState(1);
  const submenuRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const {
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    selectedProjectIds,
    dueDateFrom,
    dueDateTo,
  } = filterState;

  const isSearching = search.trim().length > 0;

  const categories: CategoryDefinition[] = [
    { key: "status", label: "Status", visible: true, activeCount: selectedStatuses.length },
    { key: "priority", label: "Priority", visible: true, activeCount: selectedPriorities.length },
    { key: "type", label: "Type", visible: showTypeFilter, activeCount: selectedTypes.length },
    {
      key: "assignee",
      label: "Assignee",
      leading: assigneeLeading,
      visible: showAssigneeFilter,
      activeCount: selectedAssignees.length,
    },
    { key: "label", label: "Label", visible: labels.length > 0, activeCount: selectedLabels.length },
    { key: "cycle", label: "Cycle", visible: cycles.length > 0, activeCount: selectedCycles.length },
    {
      key: "dates",
      label: "Due Dates",
      visible: true,
      activeCount: dueDateFrom || dueDateTo ? 1 : 0,
    },
    {
      key: "project",
      label: "Project",
      visible: (projectOptions?.length ?? 0) > 0,
      activeCount: selectedProjectIds.length,
    },
  ];

  const visibleCategories = categories.filter((c) => c.visible);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setSearch("");
      setActiveCategory(null);
    }
  }, []);

  const firstCategoryKey = visibleCategories[0]?.key ?? null;
  const resolvedCategory =
    activeCategory ??
    (!isMobile && open && !isSearching ? firstCategoryKey : null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value.trim().length > 0) {
      setActiveCategory(null);
    }
  }

  function handleSelectCategory(key: FilterCategory) {
    setNavDirection(1);
    setActiveCategory(key);
    setSearch("");
  }

  function handleCategoryKeyDown(key: FilterCategory, e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectCategory(key);
      setTimeout(() => {
        submenuRef.current?.focus();
      }, 0);
    }
  }

  function handleSubmenuClose() {
    setNavDirection(-1);
    setActiveCategory(null);
    categoryListRef.current?.focus();
  }

  function handleBackToCategories() {
    setNavDirection(-1);
    setActiveCategory(null);
    setSearch("");
  }

  const handleSwipeLeft = useCallback(() => {
    if (search.trim().length > 0) return;
    if (!activeCategory) {
      const first = visibleCategories[0];
      if (!first) return;
      setNavDirection(1);
      setActiveCategory(first.key);
      return;
    }
    const idx = visibleCategories.findIndex((c) => c.key === activeCategory);
    const next = idx >= 0 ? visibleCategories[idx + 1] : undefined;
    if (!next) return;
    setNavDirection(1);
    setActiveCategory(next.key);
  }, [activeCategory, search, visibleCategories]);

  const handleSwipeRight = useCallback(() => {
    if (search.trim().length > 0) return;
    if (!activeCategory) return;
    const idx = visibleCategories.findIndex((c) => c.key === activeCategory);
    if (idx <= 0) {
      setNavDirection(-1);
      setActiveCategory(null);
      return;
    }
    const prev = visibleCategories[idx - 1];
    if (!prev) return;
    setNavDirection(-1);
    setActiveCategory(prev.key);
  }, [activeCategory, search, visibleCategories]);

  const swipeHandlers = useHorizontalSwipe({
    enabled: isMobile && open && search.trim().length === 0,
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  const mobilePanelKey = search.trim().length > 0
    ? "search"
    : activeCategory ?? "categories";

  const drillTitle = activeCategory ? categoryTitle(activeCategory) : "Filters";

  const sharedProps = {
    statusItems,
    statusConfig,
    members,
    labels,
    cycles,
    projectOptions,
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    selectedProjectIds,
    dueDateFrom,
    dueDateTo,
    onToggleStatus,
    onTogglePriority,
    onToggleType,
    onToggleAssignee,
    onToggleLabel,
    onToggleCycle,
    onToggleProject,
    onDueDateFromChange,
    onDueDateToChange,
  };

  const categoryListProps = {
    visibleCategories,
    resolvedCategory,
    containerRef: categoryListRef,
    isMobile,
    shouldReduceMotion,
    onSelectCategory: handleSelectCategory,
    onCategoryKeyDown: handleCategoryKeyDown,
  };

  return {
    isMobile,
    open,
    handleOpenChange,
    search,
    handleSearchChange,
    activeCategory,
    navDirection,
    shouldReduceMotion,
    isSearching,
    resolvedCategory,
    mobilePanelKey,
    drillTitle,
    submenuRef,
    swipeHandlers,
    handleBackToCategories,
    handleSubmenuClose,
    sharedProps,
    categoryListProps,
    showTypeFilter,
    showAssigneeFilter,
  };
}
