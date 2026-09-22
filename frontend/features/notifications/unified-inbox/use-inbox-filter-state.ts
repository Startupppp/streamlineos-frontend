"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { InboxKind } from "@/types/inbox";
import {
  parseView,
  buildQueryParams,
  filterStateToSearchParams,
  VIEW_DEFAULT_UNREAD_ONLY,
  type InboxView,
  type InboxFilterState,
  type InboxQueryParams,
} from "./inbox-view-params";

const VALID_KINDS: ReadonlySet<string> = new Set<InboxKind>([
  "notification",
  "broadcast",
  "mail",
  "build_approval",
]);

function parseKindsFromURL(raw: string | null): InboxKind[] {
  if (!raw) return [];
  return raw.split(",").filter((k): k is InboxKind => VALID_KINDS.has(k));
}

export interface InboxFilterControl {
  filterState: InboxFilterState;
  queryParams: InboxQueryParams;
  selectedKeys: Set<string>;
  handleViewChange: (next: InboxView) => void;
  handleSearchChange: (next: string) => void;
  handleUnreadOnlyChange: (next: boolean) => void;
  handleCategoryChange: (next: string) => void;
  handlePriorityChange: (next: string) => void;
  handleKindOverrideChange: (next: InboxKind[]) => void;
  handleToggleSelect: (key: string) => void;
  handleClearSelection: () => void;
}

export function useInboxFilterState(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  router: { replace: (url: string, opts: { scroll: boolean }) => void },
): InboxFilterControl {
  const [view, setView] = useState<InboxView>(() =>
    parseView(searchParams.get("view")),
  );
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [unreadOnly, setUnreadOnly] = useState(() => {
    const v = parseView(searchParams.get("view"));
    const raw = searchParams.get("unreadOnly");
    return raw !== null
      ? raw === "true" || raw === "1"
      : VIEW_DEFAULT_UNREAD_ONLY[v];
  });
  const [category, setCategory] = useState(
    () => searchParams.get("category") ?? "",
  );
  const [priority, setPriority] = useState(
    () => searchParams.get("priority") ?? "",
  );
  const [kindOverride, setKindOverride] = useState<InboxKind[]>(() =>
    parseKindsFromURL(searchParams.get("kinds")),
  );
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const filterState = useMemo(
    (): InboxFilterState => ({
      view,
      q,
      unreadOnly,
      category,
      priority,
      kindOverride,
    }),
    [view, q, unreadOnly, category, priority, kindOverride],
  );

  useEffect(() => {
    const params = filterStateToSearchParams(filterState);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, filterState]);

  const queryParams = useMemo(() => buildQueryParams(filterState), [filterState]);

  const handleViewChange = useCallback((next: InboxView) => {
    setView(next);
    setQ("");
    setUnreadOnly(VIEW_DEFAULT_UNREAD_ONLY[next]);
    setCategory("");
    setPriority("");
    setKindOverride([]);
    setSelectedKeys(new Set());
  }, []);

  const handleSearchChange = useCallback((next: string) => {
    setQ(next);
    setSelectedKeys(new Set());
  }, []);

  const handleUnreadOnlyChange = useCallback((next: boolean) => {
    setUnreadOnly(next);
    setSelectedKeys(new Set());
  }, []);

  const handleCategoryChange = useCallback((next: string) => {
    setCategory(next);
    setSelectedKeys(new Set());
  }, []);

  const handlePriorityChange = useCallback((next: string) => {
    setPriority(next);
    setSelectedKeys(new Set());
  }, []);

  const handleKindOverrideChange = useCallback((next: InboxKind[]) => {
    setKindOverride(next);
    setSelectedKeys(new Set());
  }, []);

  const handleToggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  return {
    filterState,
    queryParams,
    selectedKeys,
    handleViewChange,
    handleSearchChange,
    handleUnreadOnlyChange,
    handleCategoryChange,
    handlePriorityChange,
    handleKindOverrideChange,
    handleToggleSelect,
    handleClearSelection,
  };
}
