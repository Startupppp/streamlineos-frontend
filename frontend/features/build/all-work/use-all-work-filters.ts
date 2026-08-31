"use client";

import { useMemo, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { AllWorkFilters } from "@/types/projects";
import { parseView, type AllWorkView } from "./all-work-view-switcher";

interface UseAllWorkFiltersReturn {
  view: AllWorkView;
  scopeMine: boolean;
  filters: AllWorkFilters;
  hasActiveFilters: boolean;
  handleViewChange: (v: AllWorkView, onClearSelection?: () => void) => void;
  handleScopeToggle: () => void;
  handleClearFilters: () => void;
}

export function useAllWorkFilters(): UseAllWorkFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const view = parseView(searchParams.get("view"));
  const scopeParam = searchParams.get("scope");
  const scopeMine = scopeParam === "mine";

  const setParam = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  const handleViewChange = useCallback(
    (v: AllWorkView, onClearSelection?: () => void) => {
      onClearSelection?.();
      setParam("view", v);
    },
    [setParam]
  );

  const handleScopeToggle = useCallback(() => {
    setParam("scope", scopeMine ? "" : "mine");
  }, [scopeMine, setParam]);

  const filters = useMemo<AllWorkFilters>(() => {
    const f: AllWorkFilters = { limit: 50 };
    const q = searchParams.get("q");
    if (q) f.search = q;
    const status = searchParams.get("status");
    if (status) f.status = status;
    const priority = searchParams.get("priority");
    if (priority) f.priority = priority;
    const type = searchParams.get("type");
    if (type) f.type = type;
    const assigneeId = searchParams.get("assigneeId");
    if (assigneeId) f.assigneeId = assigneeId;
    const labels = searchParams.get("labels");
    if (labels) f.labelIds = labels;
    const projectIds = searchParams.get("projectIds");
    if (projectIds) f.projectIds = projectIds;
    const dueDateFrom = searchParams.get("dueDateFrom");
    if (dueDateFrom) f.dueDateFrom = dueDateFrom;
    const dueDateTo = searchParams.get("dueDateTo");
    if (dueDateTo) f.dueDateTo = dueDateTo;
    if (scopeMine) f.scope = "mine";
    return f;
  }, [searchParams, scopeMine]);

  const hasActiveFilters = useMemo(() => {
    const filterKeys = ["q", "status", "priority", "type", "assigneeId", "labels", "projectIds", "dueDateFrom", "dueDateTo"];
    return filterKeys.some((k) => !!searchParams.get(k)) || scopeMine;
  }, [searchParams, scopeMine]);

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams();
      const v = searchParams.get("view");
      if (v) params.set("view", v);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  return {
    view,
    scopeMine,
    filters,
    hasActiveFilters,
    handleViewChange,
    handleScopeToggle,
    handleClearFilters,
  };
}
