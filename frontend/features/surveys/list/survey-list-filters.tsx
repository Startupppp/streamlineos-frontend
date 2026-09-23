import { useCallback } from "react";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
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

const SURVEY_MODES = [
  "survey",
  "assessment",
  "live_session",
  "lead_qualification",
  "custom",
] as const satisfies readonly SurveyMode[];

const STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: "Draft",
  testing: "Testing",
  published: "Published",
  paused: "Paused",
  closed: "Closed",
  archived: "Archived",
};

const MODE_LABELS: Record<SurveyMode, string> = {
  survey: "Survey",
  assessment: "Assessment",
  live_session: "Live session",
  lead_qualification: "Lead qualification",
  custom: "Custom",
};

interface FacetSelectsProps {
  status: SurveyStatus | "all";
  onStatusSelect: (value: string) => void;
  mode: SurveyMode | "all";
  onModeSelect: (value: string) => void;
  triggerClassName: string;
}

function FacetSelects({ status, onStatusSelect, mode, onModeSelect, triggerClassName }: FacetSelectsProps) {
  return (
    <>
      <Select name="status" value={status} onValueChange={onStatusSelect}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, triggerClassName)} aria-label="Status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="all">All statuses</SelectItem>
          {SURVEY_STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select name="mode" value={mode} onValueChange={onModeSelect}>
        <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, triggerClassName)} aria-label="Mode">
          <SelectValue placeholder="Mode" />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="all">All modes</SelectItem>
          {SURVEY_MODES.map((value) => (
            <SelectItem key={value} value={value}>
              {MODE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

export function SurveyListFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  mode,
  onModeChange,
}: SurveyListFiltersProps) {
  const handleStatusSelect = useCallback((value: string) => {
    const next = value === "all" ? "all" : SURVEY_STATUSES.find((candidate) => candidate === value);
    if (next) onStatusChange(next);
  }, [onStatusChange]);
  const handleModeSelect = useCallback((value: string) => {
    const next = value === "all" ? "all" : SURVEY_MODES.find((candidate) => candidate === value);
    if (next) onModeChange(next);
  }, [onModeChange]);

  const activeFacets = (status !== "all" ? 1 : 0) + (mode !== "all" ? 1 : 0);

  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search surveys..."
        value={search}
        onValueChange={onSearchChange}
        className="min-w-0 flex-1 md:max-w-xs"
      />
      <div className="hidden min-w-0 items-center gap-2 md:flex [&>*]:shrink-0">
        <FacetSelects
          status={status}
          onStatusSelect={handleStatusSelect}
          mode={mode}
          onModeSelect={handleModeSelect}
          triggerClassName="w-fit min-w-[8.5rem]"
        />
      </div>
      <ResponsivePopover>
        <ResponsivePopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 px-2.5 md:hidden" aria-label="Filters">
            <ListFilter className="h-4 w-4" />
            <span className="text-xs">Filters</span>
            {activeFacets > 0 ? (
              <span className="rounded-full bg-primary/10 px-1.5 text-micro font-medium tabular-nums text-primary">
                {activeFacets}
              </span>
            ) : null}
          </Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Filters" align="end" className="w-[min(18rem,calc(100vw-2rem))] p-3">
          <div className="flex flex-col gap-2">
            <FacetSelects
              status={status}
              onStatusSelect={handleStatusSelect}
              mode={mode}
              onModeSelect={handleModeSelect}
              triggerClassName="w-full"
            />
          </div>
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </div>
  );
}
