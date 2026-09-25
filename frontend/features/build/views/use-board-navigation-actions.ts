import {
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import type { ViewType } from "./view-switcher";
import type { KanbanTicket } from "@/features/build/shared/types";
import { buildTicketDetailUrl } from "@/features/build/ticket-details/build-ticket-detail-url";
import { currentSearchParams } from "@/lib/current-search-params";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { buildListSearchParams } from "../shared/use-build-list-url-state";
import {
  INITIAL_FILTERS,
  type FilterState as WorkloadFilterState,
} from "./workload-types";

interface UseBoardNavigationActionsOptions {
  projectId: number;
  pathname: string;
  searchParams: ReturnType<typeof import("next/navigation").useSearchParams>;
  projectKey: string | undefined;
  projectLoaded: boolean;
  selectedTicketId: number | null;
  highlightCommentId: number | null;
  allTickets: KanbanTicket[];
  ticketCollectionReturnHref: string;
  setSelectedIds: (selection: Set<string | number>) => void;
  setWorkloadFilters: Dispatch<SetStateAction<WorkloadFilterState>>;
}

export function useBoardNavigationActions({
  projectId,
  pathname,
  searchParams,
  projectKey,
  projectLoaded,
  selectedTicketId,
  highlightCommentId,
  allTickets,
  ticketCollectionReturnHref,
  setSelectedIds,
  setWorkloadFilters,
}: UseBoardNavigationActionsOptions) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();

  const handleClearView = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("viewId");
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleViewChange = useCallback(
    (view: ViewType) => {
      if (view === "calendar") {
        const params = currentSearchParams(searchParams);
        params.delete("view");
        params.delete("viewId");
        params.delete("ticket");
        params.delete("comment");
        params.set("source", "build");
        params.set("projectId", String(projectId));
        requestLeave(() => router.push(`/calendar?${params.toString()}`));
        setSelectedIds(new Set());
        return;
      }
      if (view === "workload") {
        const params = currentSearchParams(searchParams);
        params.delete("view");
        const query = params.toString();
        requestLeave(() =>
          router.push(
            `/build/${projectId}/workload${query ? `?${query}` : ""}`,
          ),
        );
        setSelectedIds(new Set());
        return;
      }
      const params = currentSearchParams(searchParams);
      params.set("view", view);
      if (pathname === `/build/${projectId}/workload`) {
        requestLeave(() =>
          router.push(`/build/${projectId}/issues?${params.toString()}`),
        );
        setSelectedIds(new Set());
        return;
      }
      router.replace(`?${params.toString()}`, { scroll: false });
      setSelectedIds(new Set());
    },
    [pathname, projectId, requestLeave, router, searchParams, setSelectedIds],
  );

  const handleWorkloadFilterChange = useCallback(
    <K extends keyof WorkloadFilterState>(
      key: K,
      value: WorkloadFilterState[K],
    ) => {
      setWorkloadFilters((previous) => ({ ...previous, [key]: value }));
    },
    [setWorkloadFilters],
  );

  const handleClearWorkloadFilters = useCallback(
    () => setWorkloadFilters(INITIAL_FILTERS),
    [setWorkloadFilters],
  );

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(
        projectId,
        projectKey,
        id,
        allTickets,
        undefined,
        ticketCollectionReturnHref,
      );
      if (href) requestLeave(() => router.push(href));
    },
    [
      allTickets,
      projectId,
      projectKey,
      requestLeave,
      router,
      ticketCollectionReturnHref,
    ],
  );

  useEffect(() => {
    if (!selectedTicketId || !projectLoaded) return;
    const href = buildTicketDetailUrl(
      projectId,
      projectKey,
      selectedTicketId,
      allTickets,
      highlightCommentId,
      ticketCollectionReturnHref,
    );
    if (href) router.replace(href);
  }, [
    allTickets,
    highlightCommentId,
    projectId,
    projectKey,
    projectLoaded,
    router,
    selectedTicketId,
    ticketCollectionReturnHref,
  ]);

  const handleClearSearch = useCallback(() => {
    const next = buildListSearchParams(
      searchParams,
      {
        q: null,
        status: null,
        priority: null,
        type: null,
        assigneeId: null,
        labels: null,
        cycle: null,
        module: null,
        dueDateFrom: null,
        dueDateTo: null,
        severity: null,
        qaState: null,
      },
      { resetCursor: true },
    );
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleQaFilterChange = useCallback(
    (key: "severity" | "qaState", value: string) => {
      const next = buildListSearchParams(
        searchParams,
        { [key]: value || null },
        { resetCursor: true },
      );
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      const next = currentSearchParams(searchParams);
      next.delete("create");
      next.delete("cycleId");
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleSelectionChange = useCallback(
    (selection: Set<string | number>) => {
      setSelectedIds(selection);
    },
    [setSelectedIds],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, [setSelectedIds]);

  return {
    handleClearView,
    handleViewChange,
    handleWorkloadFilterChange,
    handleClearWorkloadFilters,
    handleTicketSelect,
    handleClearSearch,
    handleQaFilterChange,
    handleCreateOpenChange,
    handleSelectionChange,
    handleClearSelection,
  };
}
