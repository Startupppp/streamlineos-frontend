"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

function parseMulti(param: string): string[] {
  return param.split(",").filter(Boolean);
}

function toggleMulti(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

export function useTicketFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const priorityParam = searchParams.get("priority") ?? "";
  const typeParam = searchParams.get("type") ?? "";
  const sprintParam = searchParams.get("sprintId") ?? "";
  const assigneeParam = searchParams.get("assigneeId") ?? "";
  const labelsParam = searchParams.get("labels") ?? "";
  const cycleParam = searchParams.get("cycle") ?? "";
  const projectIdsParam = searchParams.get("projectIds") ?? "";
  const dueDateFrom = searchParams.get("dueDateFrom") ?? "";
  const dueDateTo = searchParams.get("dueDateTo") ?? "";

  const selectedStatuses = useMemo(() => parseMulti(statusParam), [statusParam]);
  const selectedPriorities = useMemo(() => parseMulti(priorityParam), [priorityParam]);
  const selectedTypes = useMemo(() => parseMulti(typeParam), [typeParam]);
  const selectedAssignees = useMemo(() => parseMulti(assigneeParam), [assigneeParam]);
  const selectedLabels = useMemo(() => parseMulti(labelsParam), [labelsParam]);
  const selectedCycles = useMemo(() => parseMulti(cycleParam), [cycleParam]);
  const selectedProjectIds = useMemo(() => parseMulti(projectIdsParam), [projectIdsParam]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length) count += 1;
    if (selectedPriorities.length) count += 1;
    if (selectedTypes.length) count += 1;
    if (sprintParam) count += 1;
    if (selectedAssignees.length) count += 1;
    if (selectedLabels.length) count += 1;
    if (selectedCycles.length) count += 1;
    if (selectedProjectIds.length) count += 1;
    if (dueDateFrom || dueDateTo) count += 1;
    return count;
  }, [
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    sprintParam,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    selectedProjectIds,
    dueDateFrom,
    dueDateTo,
  ]);

  const setParam = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
        params.delete("page");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams],
  );

  const toggleParam = useCallback(
    (key: string, current: string[], value: string) => {
      const next = toggleMulti(current, value);
      setParam(key, next.join(","));
    },
    [setParam],
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      [
        "status",
        "priority",
        "type",
        "sprintId",
        "assigneeId",
        "labels",
        "cycle",
        "projectIds",
        "dueDateFrom",
        "dueDateTo",
        "page",
      ].forEach((k) => params.delete(k));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  const [localSearch, setLocalSearch] = useState(q);
  const debouncedLocalSearch = useDebouncedValue(localSearch, 300);
  const prevDebouncedRef = useRef(debouncedLocalSearch);

  useEffect(() => {
    if (debouncedLocalSearch === prevDebouncedRef.current) return;
    prevDebouncedRef.current = debouncedLocalSearch;
    if (debouncedLocalSearch !== q) {
      setParam("q", debouncedLocalSearch);
    }
  }, [debouncedLocalSearch, q, setParam]);

  function handleSearchChange(value: string) {
    setLocalSearch(value);
  }

  function handleToggleStatus(status: string) {
    toggleParam("status", selectedStatuses, status);
  }

  function handleTogglePriority(priority: string) {
    toggleParam("priority", selectedPriorities, priority);
  }

  function handleToggleType(type: string) {
    toggleParam("type", selectedTypes, type);
  }

  function handleToggleAssignee(id: string) {
    toggleParam("assigneeId", selectedAssignees, id);
  }

  function handleToggleLabel(id: string) {
    toggleParam("labels", selectedLabels, id);
  }

  function handleToggleCycle(id: string) {
    toggleParam("cycle", selectedCycles, id);
  }

  function handleToggleSprint(id: string) {
    setParam("sprintId", sprintParam === id ? "" : id);
  }

  function handleToggleProject(id: string) {
    toggleParam("projectIds", selectedProjectIds, id);
  }

  function handleDueDateFromChange(value: string) {
    setParam("dueDateFrom", value);
  }

  function handleDueDateToChange(value: string) {
    setParam("dueDateTo", value);
  }

  function makeRemoveStatus(status: string) {
    return function onRemoveStatus() {
      const next = selectedStatuses.filter((v) => v !== status);
      setParam("status", next.join(","));
    };
  }

  function makeRemovePriority(priority: string) {
    return function onRemovePriority() {
      const next = selectedPriorities.filter((v) => v !== priority);
      setParam("priority", next.join(","));
    };
  }

  function makeRemoveType(type: string) {
    return function onRemoveType() {
      const next = selectedTypes.filter((v) => v !== type);
      setParam("type", next.join(","));
    };
  }

  function makeRemoveAssignee(id: string) {
    return function onRemoveAssignee() {
      const next = selectedAssignees.filter((v) => v !== id);
      setParam("assigneeId", next.join(","));
    };
  }

  function makeRemoveLabel(id: string) {
    return function onRemoveLabel() {
      const next = selectedLabels.filter((v) => v !== id);
      setParam("labels", next.join(","));
    };
  }

  function makeRemoveCycle(id: string) {
    return function onRemoveCycle() {
      const next = selectedCycles.filter((v) => v !== id);
      setParam("cycle", next.join(","));
    };
  }

  function makeRemoveProject(id: string) {
    return function onRemoveProject() {
      const next = selectedProjectIds.filter((v) => v !== id);
      setParam("projectIds", next.join(","));
    };
  }

  function handleRemoveSprint() {
    setParam("sprintId", "");
  }

  function handleRemoveDueDate() {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("dueDateFrom");
      params.delete("dueDateTo");
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return {
    q,
    sprintParam,
    dueDateFrom,
    dueDateTo,
    selectedStatuses,
    selectedPriorities,
    selectedTypes,
    selectedAssignees,
    selectedLabels,
    selectedCycles,
    selectedProjectIds,
    localSearch,
    activeFilterCount,
    handleSearchChange,
    handleToggleStatus,
    handleTogglePriority,
    handleToggleType,
    handleToggleAssignee,
    handleToggleLabel,
    handleToggleCycle,
    handleToggleSprint,
    handleToggleProject,
    handleDueDateFromChange,
    handleDueDateToChange,
    makeRemoveStatus,
    makeRemovePriority,
    makeRemoveType,
    makeRemoveAssignee,
    makeRemoveLabel,
    makeRemoveCycle,
    makeRemoveProject,
    handleRemoveSprint,
    handleRemoveDueDate,
    clearAll,
  };
}
