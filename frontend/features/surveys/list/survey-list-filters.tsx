import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SurveyMode, SurveyStatus } from "@/hooks/api/surveys/forms";

interface SurveyListFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: SurveyStatus | "all";
  onStatusChange: (value: SurveyStatus | "all") => void;
  mode: SurveyMode | "all";
  onModeChange: (value: SurveyMode | "all") => void;
}

export function SurveyListFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  mode,
  onModeChange,
}: SurveyListFiltersProps) {
  const handleSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value),
    [onSearchChange],
  );
  const handleStatusSelect = useCallback((v: string) => onStatusChange(v as SurveyStatus | "all"), [onStatusChange]);
  const handleModeSelect = useCallback((v: string) => onModeChange(v as SurveyMode | "all"), [onModeChange]);

  return (
    <div className="flex items-center gap-2">
      <Input placeholder="Search surveys..." value={search} onChange={handleSearchInput} className="h-8 w-48" />
      <Select value={status} onValueChange={handleStatusSelect}>
        <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
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
        <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Mode" /></SelectTrigger>
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
