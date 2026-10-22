"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { useManagedProductProjects, type LinkedProjectRow } from "@/hooks/api/build/managed-product-projects";
import { useSetPrimaryProject, useUnlinkProjectManagedProduct } from "@/hooks/api/build/use-link-project-managed-product";
import { useProjectTeams } from "@/hooks/api/build/teams";
import { useSimpleClientsList } from "@/hooks/api/crm/clients";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";

export { type LinkedProjectRow };

export const PAGE_SIZE = 20;
const CURSOR_PARAM = "cursor";
export const PP_PREV_PARAM = "pp_prev";
export const STATUS_PARAM = "pp_status";
const HEALTH_PARAM = "pp_health";
const OWNER_PARAM = "pp_owner";
const TEAM_PARAM = "pp_team";
const CLIENT_PARAM = "pp_client";
const CONTRIB_PARAM = "pp_contrib";
const DATE_FROM_PARAM = "pp_dateFrom";
const DATE_TO_PARAM = "pp_dateTo";
const SEARCH_PARAM = "pp_search";

function positiveQueryId(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return id > 0 ? id : undefined;
}

function isoDateTime(value: string, endOfDay: boolean): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString() : undefined;
}

const CONTRIB_BUCKETS: Record<string, { min: number; max: number }> = {
  none: { min: 0, max: 0 },
  low: { min: 1, max: 30 },
  medium: { min: 31, max: 70 },
  high: { min: 71, max: 100 },
};

const LINK_PROJECT_ACTION = {
  id: "link-project",
  label: "Link existing project",
  icon: Link2,
  primary: false as const,
};

interface UseProductProjectsPageProps {
  managedProductId: number;
}

export function useProductProjectsPage({ managedProductId }: UseProductProjectsPageProps) {
  const canManage = useCan("build:managed-products:update");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [unlinkProjectId, setUnlinkProjectId] = useState<number | null>(null);

  const statusRaw = searchParams.get(STATUS_PARAM) ?? "";
  const healthRaw = searchParams.get(HEALTH_PARAM) ?? "";
  const ownerRaw = searchParams.get(OWNER_PARAM) ?? "";
  const statusValue = statusRaw ? statusRaw.split(",").filter(Boolean) : [];
  const healthValue = healthRaw ? healthRaw.split(",").filter(Boolean) : [];
  const ownerValue = ownerRaw ? ownerRaw.split(",").filter(Boolean) : [];
  const teamValue = searchParams.get(TEAM_PARAM) ?? "";
  const clientValue = searchParams.get(CLIENT_PARAM) ?? "";
  const contribValue = searchParams.get(CONTRIB_PARAM) ?? "";
  const dateFromValue = searchParams.get(DATE_FROM_PARAM) ?? "";
  const dateToValue = searchParams.get(DATE_TO_PARAM) ?? "";
  const searchValue = searchParams.get(SEARCH_PARAM) ?? "";
  const cursorValue = searchParams.get(CURSOR_PARAM) ?? undefined;
  const prevParamValue = searchParams.get(PP_PREV_PARAM);

  const debouncedSearch = useDebouncedValue(searchValue, 300);

  const { data: teamsData } = useProjectTeams({ pageSize: 100 });
  const teamOptions = (teamsData?.data ?? []).map((t) => ({ value: String(t.id), label: t.name }));

  const { data: crmClients } = useSimpleClientsList();
  const clientOptions = (crmClients ?? []).map((c) => ({ value: String(c.id), label: c.name ?? `Client #${c.id}` }));

  const isFiltered = Boolean(
    statusValue.length || healthValue.length || ownerValue.length || teamValue || clientValue || contribValue || dateFromValue || dateToValue || searchValue,
  );

  const contribRange = contribValue ? CONTRIB_BUCKETS[contribValue] : null;
  const validStatuses = statusValue.filter((s) => s === "ACTIVE" || s === "COMPLETED" || s === "ARCHIVED");
  const validHealthValues = healthValue.filter((h) => h === "on_track" || h === "at_risk" || h === "off_track");
  const validOwnerIds = ownerValue.map((v) => positiveQueryId(v)).filter((id): id is number => id !== undefined);

  const params = {
    managedProductId,
    limit: PAGE_SIZE,
    cursor: cursorValue,
    ...(validStatuses.length > 0 ? { status: validStatuses } : {}),
    ...(validHealthValues.length > 0 ? { health: validHealthValues } : {}),
    ...(validOwnerIds.length > 0 ? { ownerId: validOwnerIds } : {}),
    ...(positiveQueryId(teamValue) !== undefined ? { teamId: positiveQueryId(teamValue) } : {}),
    ...(positiveQueryId(clientValue) !== undefined ? { clientId: positiveQueryId(clientValue) } : {}),
    ...(contribRange ? { minContribution: contribRange.min, maxContribution: contribRange.max } : {}),
    ...(isoDateTime(dateFromValue, false) ? { dateFrom: isoDateTime(dateFromValue, false) } : {}),
    ...(isoDateTime(dateToValue, true) ? { dateTo: isoDateTime(dateToValue, true) } : {}),
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  };

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useManagedProductProjects(params);

  const rows = data?.data ?? [];
  const hasMore = data?.pagination.hasMore ?? false;
  const nextCursor = data?.pagination.nextCursor ?? null;
  const hasPrevious = Boolean(prevParamValue) || Boolean(cursorValue);

  const resolution = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: rows.length === 0,
  });

  const isFilteredEmpty = !isLoading && rows.length === 0 && isFiltered;

  function writeParams(updates: Record<string, string | null>, resetCursor = false, useHistory = false) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetCursor) {
      next.delete(CURSOR_PARAM);
      next.delete(PP_PREV_PARAM);
    }
    const query = next.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      if (useHistory) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    });
  }

  function handleStatusChange(values: string[]) { writeParams({ [STATUS_PARAM]: values.length > 0 ? values.join(",") : null }, true); }
  function handleHealthChange(values: string[]) { writeParams({ [HEALTH_PARAM]: values.length > 0 ? values.join(",") : null }, true); }
  function handleOwnerChange(values: string[]) { writeParams({ [OWNER_PARAM]: values.length > 0 ? values.join(",") : null }, true); }
  function handleTeamChange(value: string) { writeParams({ [TEAM_PARAM]: value || null }, true); }
  function handleClientChange(value: string) { writeParams({ [CLIENT_PARAM]: value || null }, true); }
  function handleContribChange(value: string) { writeParams({ [CONTRIB_PARAM]: value || null }, true); }
  function handleDateFromChange(value: string) { writeParams({ [DATE_FROM_PARAM]: value || null }, true); }
  function handleDateToChange(value: string) { writeParams({ [DATE_TO_PARAM]: value || null }, true); }
  function handleSearchChange(value: string) { writeParams({ [SEARCH_PARAM]: value || null }, true); }

  function handleClearFilters() {
    const next = new URLSearchParams(searchParams.toString());
    for (const p of [STATUS_PARAM, HEALTH_PARAM, OWNER_PARAM, TEAM_PARAM, CLIENT_PARAM, CONTRIB_PARAM, DATE_FROM_PARAM, DATE_TO_PARAM, SEARCH_PARAM, CURSOR_PARAM, PP_PREV_PARAM]) {
      next.delete(p);
    }
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function handleNextPage() {
    if (!nextCursor) return;
    const stack = prevParamValue ? prevParamValue.split("|") : [];
    stack.push(cursorValue ?? "0");
    writeParams({ [CURSOR_PARAM]: nextCursor, [PP_PREV_PARAM]: stack.join("|") }, false, true);
  }

  function handlePreviousPage() {
    const stack = prevParamValue ? prevParamValue.split("|") : [];
    const goToRaw = stack.pop() ?? "0";
    writeParams({
      [CURSOR_PARAM]: goToRaw === "0" ? null : goToRaw,
      [PP_PREV_PARAM]: stack.length > 0 ? stack.join("|") : null,
    }, false, true);
  }

  const unlinkMutation = useUnlinkProjectManagedProduct();

  function handleUnlinkClick(row: LinkedProjectRow) {
    if (canManage) setUnlinkProjectId(row.id);
  }

  function handleUnlinkConfirm() {
    if (!unlinkProjectId) return;
    unlinkMutation.mutate(
      { projectId: unlinkProjectId, managedProductId },
      {
        onSuccess: () => {
          toast.success("Project unlinked from product");
          setUnlinkProjectId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  const setPrimaryMutation = useSetPrimaryProject();

  function handleSetPrimaryClick(row: LinkedProjectRow) {
    if (!canManage) return;
    setPrimaryMutation.mutate(
      { projectId: row.id, managedProductId },
      {
        onSuccess: () => toast.success(`This product is now the primary product for ${row.name}`),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleUnlinkDialogOpenChange(open: boolean) {
    if (!open) setUnlinkProjectId(null);
  }

  function handleRetry() { void refetch(); }

  const headerActions =
    canManage && resolution.kind !== "denied" && resolution.kind !== "not-found"
      ? [{ ...LINK_PROJECT_ACTION, onSelect: () => setLinkDialogOpen(true) }]
      : [];

  return {
    canManage,
    rows,
    hasMore,
    hasPrevious,
    resolution,
    isFiltered,
    isFilteredEmpty,
    isLoading,
    statusValue,
    healthValue,
    ownerValue,
    teamValue,
    clientValue,
    contribValue,
    teamOptions,
    clientOptions,
    dateFromValue,
    dateToValue,
    searchValue,
    searchInputRef,
    linkDialogOpen,
    setLinkDialogOpen,
    unlinkProjectId,
    unlinkMutation,
    headerActions,
    handleStatusChange,
    handleHealthChange,
    handleOwnerChange,
    handleTeamChange,
    handleClientChange,
    handleContribChange,
    handleDateFromChange,
    handleDateToChange,
    handleSearchChange,
    handleClearFilters,
    handleNextPage,
    handlePreviousPage,
    handleUnlinkClick,
    handleSetPrimaryClick,
    handleUnlinkConfirm,
    handleUnlinkDialogOpenChange,
    handleRetry,
    dataUpdatedAt,
  };
}
