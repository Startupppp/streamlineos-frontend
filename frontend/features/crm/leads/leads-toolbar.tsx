"use client";

import { useState, useCallback, useEffect } from "react";
import { LayoutGrid, TableIcon, X, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useCrmOptions } from "@/hooks/api/crm/metadata";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import type { DataScope } from "@/types/access";

interface LeadsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  view: "table" | "kanban" | "funnel";
  onViewChange: (view: "table" | "kanban" | "funnel") => void;
  statusFilter?: string;
  priorityFilter?: string;
  sourceFilter?: string;
  onStatusFilterChange: (value: string | undefined) => void;
  onPriorityFilterChange: (value: string | undefined) => void;
  onSourceFilterChange: (value: string | undefined) => void;
  onClearFilters: () => void;
  scope: DataScope;
}

export function LeadsToolbar({
  searchQuery, onSearchChange, view, onViewChange,
  statusFilter, priorityFilter, sourceFilter,
  onStatusFilterChange, onPriorityFilterChange, onSourceFilterChange,
  onClearFilters, scope,
}: LeadsToolbarProps) {
  const { data: statusOptions = [] } = useCrmOptions("lead_status");
  const { data: priorityOptions = [] } = useCrmOptions("priority");
  const { data: sourceOptions = [] } = useCrmOptions("source");

  const [inputValue, setInputValue] = useState(searchQuery);
  const debouncedInput = useDebouncedValue(inputValue, 300);

  useEffect(() => {
    if (debouncedInput === searchQuery) return;
    onSearchChange(debouncedInput);
  }, [debouncedInput, searchQuery, onSearchChange]);

  useEffect(() => {
    if (searchQuery !== inputValue && searchQuery === "") {
      setInputValue("");
    }
  }, [searchQuery, inputValue]);

  const handleSearchChange = useCallback((value: string) => setInputValue(value), []);
  const handleStatusFilter = useCallback((v: string) => onStatusFilterChange(v === "all" ? undefined : v), [onStatusFilterChange]);
  const handlePriorityFilter = useCallback((v: string) => onPriorityFilterChange(v === "all" ? undefined : v), [onPriorityFilterChange]);
  const handleSourceFilter = useCallback((v: string) => onSourceFilterChange(v === "all" ? undefined : v), [onSourceFilterChange]);

  const hasFilters = !!(statusFilter || priorityFilter || sourceFilter);

  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput placeholder="Search leads..." value={inputValue} onValueChange={handleSearchChange} />

      <ViewToggle
        value={view}
        options={[
          { value: "table", icon: TableIcon, label: "Table view" },
          { value: "kanban", icon: LayoutGrid, label: "Kanban view" },
          { value: "funnel", icon: GitBranch, label: "Funnel view" },
        ]}
        onChange={onViewChange}
      />

      <Select value={statusFilter || "all"} onValueChange={handleStatusFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px]")}><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Status</SelectItem>
          {statusOptions.map((s) => (
            <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priorityFilter || "all"} onValueChange={handlePriorityFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[100px]")}><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Priority</SelectItem>
          {priorityOptions.map((p) => (
            <SelectItem key={p.key} value={p.key} className="text-xs">{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sourceFilter || "all"} onValueChange={handleSourceFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px]")}><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Sources</SelectItem>
          {sourceOptions.map((s) => (
            <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(scope === "own" || scope === "team") && (
        <Badge
          variant="outline"
          className="h-5 shrink-0 self-center px-2 text-micro font-medium border-status-info-rule bg-status-info-surface text-status-info-ink"
        >
          {scope === "own" ? "Your leads only" : "Your team's leads"}
        </Badge>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" className="text-dense px-2" onClick={onClearFilters}>
          <X className="h-3 w-3 mr-1" />Clear
        </Button>
      )}
    </div>
  );
}
