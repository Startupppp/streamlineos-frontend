"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UserCombobox } from "@/components/ui/user-combobox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useKbSpaces } from "@/hooks/api/kb/spaces";

export const REVIEWS_ALL_VALUE = "all";
const SEARCH_DEBOUNCE_MS = 300;

export interface ReviewsFilterValues {
  q: string;
  status: string;
  type: string;
  spaceId: string;
  reviewer: string;
  dueFrom: string;
  dueTo: string;
}

export interface ReviewsFiltersProps {
  values: ReviewsFilterValues;
  onChange: (patch: Record<string, string | null>) => void;
}

export function ReviewsFilters({ values, onChange }: ReviewsFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(values.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data ?? [];

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setSearchDraft(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange({ q: next || null });
      }, SEARCH_DEBOUNCE_MS);
    },
    [onChange],
  );

  const handleStatusChange = useCallback(
    (next: string) => onChange({ status: next === REVIEWS_ALL_VALUE ? null : next }),
    [onChange],
  );

  const handleTypeChange = useCallback(
    (next: string) => onChange({ type: next === REVIEWS_ALL_VALUE ? null : next }),
    [onChange],
  );

  const handleSpaceChange = useCallback(
    (next: string) => onChange({ spaceId: next === REVIEWS_ALL_VALUE ? null : next }),
    [onChange],
  );

  const handleReviewerChange = useCallback(
    (next: string) => onChange({ reviewer: next || null }),
    [onChange],
  );

  const handleDueRangeChange = useCallback(
    (range: { from: string; to: string }) =>
      onChange({ dueFrom: range.from || null, dueTo: range.to || null }),
    [onChange],
  );

  const handleClearAdvanced = useCallback(
    () => onChange({ spaceId: null, reviewer: null, dueFrom: null, dueTo: null }),
    [onChange],
  );

  const advancedCount =
    (values.spaceId ? 1 : 0) +
    (values.reviewer ? 1 : 0) +
    (values.dueFrom || values.dueTo ? 1 : 0);

  return (
    <>
      <Input
        type="search"
        placeholder="Search reviewed pages…"
        value={searchDraft}
        onChange={handleSearchChange}
        className="w-[200px]"
        aria-label="Search reviews"
      />
      <Select value={values.status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={REVIEWS_ALL_VALUE}>All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>
      <Select value={values.type} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={REVIEWS_ALL_VALUE}>All types</SelectItem>
          <SelectItem value="approval">Approval</SelectItem>
          <SelectItem value="freshness">Freshness</SelectItem>
        </SelectContent>
      </Select>
      <ResponsivePopover>
        <ResponsivePopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            {advancedCount > 0 ? `More filters (${advancedCount})` : "More filters"}
          </Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent className="w-[280px] space-y-3 p-3" align="end">
          <div className="space-y-1.5">
            <Label className="text-xs">Space</Label>
            <Select
              value={values.spaceId || REVIEWS_ALL_VALUE}
              onValueChange={handleSpaceChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All spaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={REVIEWS_ALL_VALUE}>All spaces</SelectItem>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={String(space.id)}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reviewer</Label>
            <UserCombobox
              value={values.reviewer}
              onChange={handleReviewerChange}
              placeholder="Any reviewer"
              allowUnassigned
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Due between</Label>
            <DateRangePicker
              from={values.dueFrom}
              to={values.dueTo}
              onChange={handleDueRangeChange}
              placeholder="Any due date"
              className="w-full"
              align="end"
            />
          </div>
          {advancedCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleClearAdvanced}
            >
              Clear these filters
            </Button>
          )}
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </>
  );
}
