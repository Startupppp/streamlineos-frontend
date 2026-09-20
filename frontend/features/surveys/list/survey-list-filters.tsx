import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import type { SurveyMode, SurveyStatus } from "@/hooks/api/surveys/forms";

interface SurveyListFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: SurveyStatus | "all";
  onStatusChange: (value: SurveyStatus | "all") => void;
  mode: SurveyMode | "all";
  onModeChange: (value: SurveyMode | "all") => void;
}

const SURVEY_STATUSES = [
  "draft",
  "testing",
  "published",
  "paused",
  "closed",
  "archived",
] as const satisfies readonly SurveyStatus[];

export function SurveyListFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  mode,
  onModeChange,
}: SurveyListFiltersProps) {
  const handleStatusSelect = useCallback((v: string) => {
    const next = v === "all" ? "all" : SURVEY_STATUSES.find((candidate) => candidate === v);
    if (next) onStatusChange(next);
  }, [onStatusChange]);
  const handleModeSelect = useCallback((v: string) => onModeChange(v as SurveyMode | "all"), [onModeChange]);

  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search surveys..."
        value={search}
        onValueChange={onSearchChange}
        className="min-w-0 flex-1 sm:flex-initial sm:min-w-[200px]"
      />
      <Select value={status} onValueChange={handleStatusSelect}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "min-w-[120px] w-fit")}><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="testing">Testing</SelectItem>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="paused">Paused</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      <Select value={mode} onValueChange={handleModeSelect}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "min-w-[140px] w-fit")}><SelectValue placeholder="Mode" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All modes</SelectItem>
          <SelectItem value="survey">Survey</SelectItem>
          <SelectItem value="assessment">Assessment</SelectItem>
          <SelectItem value="live_session">Live Session</SelectItem>
          <SelectItem value="lead_qualification">Lead Qualification</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
