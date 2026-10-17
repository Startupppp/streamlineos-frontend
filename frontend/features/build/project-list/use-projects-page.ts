"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  HEALTH_OPTIONS,
  STATUS_OPTIONS,
  type ProjectActiveFilters,
} from "@/features/build/project-list/add-filter-popover";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { normalizeListSearch } from "@/lib/build/normalize-list-search";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { buildListSearchParams } from "@/features/build/shared/use-build-list-url-state";

type ViewMode = "grid" | "list";
const VIEW_MODES: readonly ViewMode[] = ["grid", "list"];

function readDateFilter(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.toISOString().slice(0, 10) === value ? value : undefined;
}

export type { ViewMode };
export { VIEW_MODES };

interface ProjectsPageUrlState {
  createOpen: boolean;
  handleCreateOpenChange: (open: boolean) => void;
  handleOpenCreate: () => void;
  localSearch: string;
  debouncedSearch: string;
  updateParams: (updates: Record<string, string | null>) => void;
  viewMode: ViewMode;
  activeFilters: ProjectActiveFilters;
  filterManagerId: string | undefined;
  filterProductId: string | null;
  filterClientId: string | undefined;
  filterHealth: (typeof HEALTH_OPTIONS)[number] | undefined;
  handleSearchChange: (value: string) => void;
  handleViewModeChange: (value: ViewMode) => void;
  handleFiltersChange: (next: ProjectActiveFilters) => void;
}

export function useProjectsPage(): ProjectsPageUrlState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [manualCreateOpen, setManualCreateOpen] = useState(false);
  const createFromUrl = searchParams.get("create") === "1";
  const createOpen = createFromUrl || manualCreateOpen;

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      setManualCreateOpen(open);
      if (!open && searchParams.get("create")) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("create");
        const query = params.toString();
        startTransition(() => {
          router.replace(query ? `${pathname}?${query}` : pathname, {
            scroll: false,
          });
        });
      }
    },
    [searchParams, router, pathname],
  );

  const handleOpenCreate = useCallback(() => {
    setManualCreateOpen(true);
  }, []);

  const writeParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = buildListSearchParams(searchParams, updates, {
        resetCursor: true,
      });
      startTransition(() => {
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [searchParams, router, pathname],
  );

  const urlSearch = searchParams.get("q") || "";
  const [ownQueries, setOwnQueries] = useState<readonly string[]>(() => [urlSearch]);
  const searchSource = ownQueries.includes(urlSearch) ? "own" : `external:${urlSearch}`;
  const [localSearch, setLocalSearch] = useSourceOverride(searchSource, urlSearch);
  const debouncedSearch = useDebouncedValue(localSearch, 300);

  const rememberOwnQuery = useCallback((query: string) => {
    setOwnQueries((previous) =>
      previous.includes(query) ? previous : [...previous.slice(-19), query],
    );
  }, []);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const nextQuery = updates["q"];
      if (nextQuery !== undefined) {
        rememberOwnQuery(nextQuery ?? "");
        setLocalSearch(nextQuery ?? "");
      }
      writeParams(updates);
    },
    [rememberOwnQuery, setLocalSearch, writeParams],
  );

  const writeParamsRef = useRef(writeParams);
  useLayoutEffect(() => {
    writeParamsRef.current = writeParams;
  }, [writeParams]);

  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    },
    [],
  );

  const viewMode =
    VIEW_MODES.find((v) => v === searchParams.get("view")) ?? "list";
  const filterStatus = STATUS_OPTIONS.find(
    (s) => s === searchParams.get("filterStatus"),
  );
  const filterHealth = HEALTH_OPTIONS.find(
    (h) => h === searchParams.get("filterHealth"),
  );
  const filterLead = searchParams.get("filterLead") ?? undefined;
  const filterStartAfter = readDateFilter(searchParams.get("startAfter"));
  const filterEndBefore = readDateFilter(searchParams.get("endBefore"));
  const filterManagerId = searchParams.get("managerId") ?? filterLead;
  const filterProductId = searchParams.get("productId");
  const filterClientId = searchParams.get("clientId") ?? undefined;

  const activeFilters: ProjectActiveFilters = useMemo(
    () => ({
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterHealth ? { health: filterHealth } : {}),
      ...(filterManagerId ? { lead: filterManagerId } : {}),
      ...(filterStartAfter ? { startAfter: filterStartAfter } : {}),
      ...(filterEndBefore ? { endBefore: filterEndBefore } : {}),
    }),
    [filterStatus, filterHealth, filterManagerId, filterStartAfter, filterEndBefore],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      const next = normalizeListSearch(value);
      setLocalSearch(next);
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        pushTimerRef.current = null;
        rememberOwnQuery(next);
        writeParamsRef.current({ q: next || null });
      }, 300);
    },
    [setLocalSearch, rememberOwnQuery],
  );

  const handleViewModeChange = useCallback(
    (value: ViewMode) =>
      updateParams({ view: value === "list" ? null : value }),
    [updateParams],
  );

  const handleFiltersChange = useCallback(
    (next: ProjectActiveFilters) => {
      updateParams({
        filterStatus: next.status ?? null,
        filterHealth: next.health ?? null,
        managerId: next.lead ?? null,
        filterLead: null,
        startAfter: next.startAfter ?? null,
        endBefore: next.endBefore ?? null,
      });
    },
    [updateParams],
  );

  return {
    createOpen,
    handleCreateOpenChange,
    handleOpenCreate,
    localSearch,
    debouncedSearch,
    updateParams,
    viewMode,
    activeFilters,
    filterManagerId,
    filterProductId,
    filterClientId,
    filterHealth,
    handleSearchChange,
    handleViewModeChange,
    handleFiltersChange,
  };
}
