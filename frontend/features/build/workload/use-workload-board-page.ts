import { useState, useCallback, useMemo } from "react";
import { format, addDays } from "date-fns";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useProject } from "@/hooks/api/build/projects";
import { useProjectBoardTickets } from "@/hooks/api/build/tickets";
import { useWorkloadCapacity } from "@/hooks/api/build/workload-capacity";
import { useProjectTeams } from "@/hooks/api/build/teams";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { mapBoardTicketToKanban } from "@/features/build/my-tickets/map-board-ticket";
import {
  INITIAL_FILTERS,
  isWorkloadGroup,
  type FilterState as WorkloadFilterState,
  type WorkloadGroup,
} from "@/features/build/views/workload-types";
import type { ViewType } from "@/features/build/views/view-switcher";

export function useWorkloadBoardPage(projectId: number) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const memberId = searchParams.get("memberId");
  const teamIdStr = searchParams.get("teamId");
  const rawGroup = searchParams.get("group");
  const group: WorkloadGroup =
    rawGroup !== null && isWorkloadGroup(rawGroup) ? rawGroup : "none";
  const teamIdParam = teamIdStr !== null ? parseInt(teamIdStr) : undefined;

  const capacityWindow = useMemo(() => {
    const today = new Date();
    return {
      start: from ?? format(today, "yyyy-MM-dd"),
      end: to ?? format(addDays(today, 13), "yyyy-MM-dd"),
    };
  }, [from, to]);

  const boardFilters = useMemo(
    () => ({ assigneeId: memberId ?? undefined }),
    [memberId],
  );

  const {
    data,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorValue,
    refetch: refetchProject,
  } = useProject(projectId);

  const { data: boardTickets, isLoading: ticketsLoading } =
    useProjectBoardTickets(projectId, boardFilters);

  const { data: capacityByMemberId } = useWorkloadCapacity(
    projectId,
    capacityWindow.start,
    capacityWindow.end,
    teamIdParam,
  );

  const { data: teamsPage } = useProjectTeams();
  const teams = useMemo(
    () => (teamsPage?.data ?? []).map((t) => ({ id: t.id, name: t.name })),
    [teamsPage],
  );

  const allTickets = useMemo(
    () => (boardTickets ? boardTickets.map(mapBoardTicketToKanban) : []),
    [boardTickets],
  );

  const members = useMemo(() => {
    if (!data?.members) return [];
    return data.members.flatMap((member) => {
      if (!member.user) return [];
      return [
        {
          id: member.user.id,
          name: member.user.name ?? null,
          firstName: member.user.firstName ?? null,
          lastName: member.user.lastName ?? null,
          image: member.user.image ?? null,
        },
      ];
    });
  }, [data?.members]);

  const statuses = data?.statuses;

  const createParamOpen = searchParams.get("create") === "1";

  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const [localFilters, setLocalFilters] = useState<WorkloadFilterState>({
    ...INITIAL_FILTERS,
    assigneeId: memberId ?? "all",
    teamId: teamIdStr ?? "all",
  });

  const workloadFilters = useMemo<WorkloadFilterState>(
    () => ({ ...localFilters, assigneeId: memberId ?? "all", teamId: teamIdStr ?? "all" }),
    [localFilters, memberId, teamIdStr],
  );

  const handleWorkloadFilterChange = useCallback(
    <K extends keyof WorkloadFilterState>(
      key: K,
      value: WorkloadFilterState[K],
    ) => {
      if (key === "assigneeId") {
        const next = new URLSearchParams(searchParams.toString());
        const strValue = String(value);
        if (strValue && strValue !== "all") {
          next.set("memberId", strValue);
        } else {
          next.delete("memberId");
        }
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      } else if (key === "teamId") {
        const next = new URLSearchParams(searchParams.toString());
        const strValue = String(value);
        if (strValue && strValue !== "all") {
          next.set("teamId", strValue);
        } else {
          next.delete("teamId");
        }
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      } else {
        setLocalFilters((prev) => ({ ...prev, [key]: value }));
      }
    },
    [pathname, router, searchParams],
  );

  const handleClearWorkloadFilters = useCallback(() => {
    setLocalFilters(INITIAL_FILTERS);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("memberId");
    next.delete("teamId");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const handleGroupChange = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === "none") next.delete("group");
      else next.set("group", value);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      const next = new URLSearchParams(searchParams.toString());
      if (open) {
        next.set("create", "1");
      } else {
        next.delete("create");
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const handleKeyboardCreate = useCallback(
    () => handleCreateOpenChange(true),
    [handleCreateOpenChange],
  );

  const handleOpenShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(true);
  }, []);

  const handleShortcutHelpOpenChange = useCallback((open: boolean) => {
    setShortcutHelpOpen(open);
  }, []);

  const handleViewChange = useCallback(
    (view: ViewType) => {
      if (view === "workload") return;
      const next = new URLSearchParams(searchParams.toString());
      next.set("view", view);
      router.push(`/build/${projectId}/issues?${next.toString()}`);
    },
    [projectId, router, searchParams],
  );

  const handleOpenFocusedMember = useCallback(
    (index: number) => {
      const member = members[index];
      if (!member) return;
      const next = new URLSearchParams(searchParams.toString());
      next.set("memberId", member.id);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [members, pathname, router, searchParams],
  );

  const handleClearSelection = useCallback(() => {}, []);

  const { focusedIndex } = useBuildListKeyboard({
    itemCount: members.length,
    onOpen: handleOpenFocusedMember,
    onClearSelection: handleClearSelection,
    onCreate: handleKeyboardCreate,
    onShortcutHelp: handleOpenShortcutHelp,
    enabled: true,
  });

  const focusedMemberId =
    focusedIndex === null ? null : (members[focusedIndex]?.id ?? null);

  const handleRetryProject = useCallback(
    () => void refetchProject(),
    [refetchProject],
  );

  const isOnline = useOnlineStatus();

  const resolution = usePageState({
    permission: "build:view",
    isLoading: projectLoading || ticketsLoading,
    isError: projectError,
    error: projectErrorValue,
  });

  return {
    data,
    projectLoading,
    projectError,
    projectErrorValue,
    ticketsLoading,
    allTickets,
    members,
    statuses,
    capacityByMemberId,
    teams,
    createParamOpen,
    shortcutHelpOpen,
    workloadFilters,
    group,
    focusedMemberId,
    handleWorkloadFilterChange,
    handleClearWorkloadFilters,
    handleGroupChange,
    handleCreateOpenChange,
    handleViewChange,
    handleRetryProject,
    handleShortcutHelpOpenChange,
    isOnline,
    resolution,
  };
}
