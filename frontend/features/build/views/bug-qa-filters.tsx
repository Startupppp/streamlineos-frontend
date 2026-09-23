"use client";

import { memo, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCan } from "@/hooks/api/access";
import {
  BUG_SEVERITIES,
  BUG_STATUSES,
  bugStatusLabel,
} from "@/features/build/shared/bug-qa-vocabulary";

const ANY_SEVERITY = "all-severities";
const ANY_QA_STATE = "all-qa-states";

const QA_SELECT_TRIGGER = "h-9 w-fit min-w-0 shrink-0 gap-1 px-2 text-xs";

interface BugQaFiltersProps {
  severity: string;
  qaState: string;
  onChange: (key: "severity" | "qaState", value: string) => void;
}

export const BugQaFilters = memo(function BugQaFilters({
  severity,
  qaState,
  onChange,
}: BugQaFiltersProps) {
  const canViewBugs = useCan("build:bugs:view");

  const handleSeverityChange = useCallback(
    (value: string) => {
      onChange("severity", value === ANY_SEVERITY ? "" : value);
    },
    [onChange],
  );

  const handleQaStateChange = useCallback(
    (value: string) => {
      onChange("qaState", value === ANY_QA_STATE ? "" : value);
    },
    [onChange],
  );

  if (!canViewBugs) return null;

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1">
      <Select
        value={severity || ANY_SEVERITY}
        onValueChange={handleSeverityChange}
      >
        <SelectTrigger className={QA_SELECT_TRIGGER} aria-label="Filter by severity">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_SEVERITY} className="text-xs">
            All severities
          </SelectItem>
          {BUG_SEVERITIES.map((value) => (
            <SelectItem key={value} value={value} className="text-xs capitalize">
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={qaState || ANY_QA_STATE} onValueChange={handleQaStateChange}>
        <SelectTrigger className={QA_SELECT_TRIGGER} aria-label="Filter by QA state">
          <SelectValue placeholder="QA state" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_QA_STATE} className="text-xs">
            All QA states
          </SelectItem>
          {BUG_STATUSES.map((value) => (
            <SelectItem key={value} value={value} className="text-xs">
              {bugStatusLabel(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});
