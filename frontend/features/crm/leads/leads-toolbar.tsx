"use client";

import { useState, useCallback, useEffect } from "react";
import { LayoutGrid, TableIcon, X, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { useCrmOptions } from "@/hooks/api/crm";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

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
}

export function LeadsToolbar({
  searchQuery, onSearchChange, view, onViewChange,
  statusFilter, priorityFilter, sourceFilter,
  onStatusFilterChange, onPriorityFilterChange, onSourceFilterChange,
  onClearFilters,
}: LeadsToolbarProps) {
  const { data: statusOptions = [] } = useCrmOptions("lead_status");
  const { data: priorityOptions = [] } = useCrmOptions("priority");
  const { data: sourceOptions = [] } = useCrmOptions("source");

  const statuses = statusOptions;
  const priorities = priorityOptions;
  const sources = sourceOptions;

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
  const handleViewTable = useCallback(() => onViewChange("table"), [onViewChange]);
  const handleViewKanban = useCallback(() => onViewChange("kanban"), [onViewChange]);
  const handleViewFunnel = useCallback(() => onViewChange("funnel"), [onViewChange]);
  const handleStatusFilter = useCallback((v: string) => onStatusFilterChange(v === "all" ? undefined : v), [onStatusFilterChange]);
  const handlePriorityFilter = useCallback((v: string) => onPriorityFilterChange(v === "all" ? undefined : v), [onPriorityFilterChange]);
  const handleSourceFilter = useCallback((v: string) => onSourceFilterChange(v === "all" ? undefined : v), [onSourceFilterChange]);

  const hasFilters = !!(statusFilter || priorityFilter || sourceFilter);

  return (
    <div className={FILTER_TOOLBAR_ROW}>
        <SearchInput placeholder="Search leads..." value={inputValue} onValueChange={handleSearchChange} />

      <div className="flex h-9 items-center rounded-md border border-input bg-card">
        <Button variant={view === "table" ? "default" : "ghost"} size="sm"
          className={cn("rounded-r-none h-9 px-2.5")}
          onClick={handleViewTable}>
          <TableIcon className="h-3.5 w-3.5" />
        </Button>
        <Button variant={view === "kanban" ? "default" : "ghost"} size="sm"
          className={cn("rounded-none h-9 px-2.5 border-x border-input")}
          onClick={handleViewKanban}>
          <LayoutGrid className="h-3.5 w-3.5" />
        </Button>
        <Button variant={view === "funnel" ? "default" : "ghost"} size="sm"
          className={cn("rounded-l-none h-9 px-2.5")}
          onClick={handleViewFunnel}>
          <GitBranch className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Select value={statusFilter || "all"} onValueChange={handleStatusFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px]")}><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Status</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priorityFilter || "all"} onValueChange={handlePriorityFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[100px]")}><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Priority</SelectItem>
          {priorities.map((p) => (
            <SelectItem key={p.key} value={p.key} className="text-xs">{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sourceFilter || "all"} onValueChange={handleSourceFilter}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px]")}><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Sources</SelectItem>
          {sources.map((s) => (
            <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="text-[11px] px-2" onClick={onClearFilters}>
          <X className="h-3 w-3 mr-1" />Clear
        </Button>
      )}
    </div>
  );
}
