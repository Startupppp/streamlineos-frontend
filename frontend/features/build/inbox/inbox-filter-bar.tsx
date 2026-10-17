"use client";

import * as React from "react";
import { X } from "lucide-react";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import type {
  NotificationCategory,
  NotificationSection,
} from "@/types/notifications";
import {
  BUILD_INBOX_ACTIVE_SECTIONS,
  BUILD_INBOX_CATEGORIES,
  getBuildInboxTriageSection,
  isBuildInboxCategory,
} from "./inbox-categories";

const ALL_TYPES_SENTINEL = "__all__" as const;
const TYPE_OPTIONS = [
  { value: ALL_TYPES_SENTINEL, label: "All types" },
  ...BUILD_INBOX_CATEGORIES,
] as const;

interface InboxFilterBarProps {
  section?: NotificationSection;
  onSectionChange?: (section: NotificationSection) => void;
  q: string | null;
  type: NotificationCategory | null;
  projectId?: number | null;
  hasActiveFilters: boolean;
  onQChange: (raw: string) => void;
  onTypeChange: (value: NotificationCategory | null) => void;
  onProjectClear?: () => void;
  onClearFilters: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function InboxFilterBar({
  section = "UNREAD",
  onSectionChange,
  q,
  type,
  projectId = null,
  hasActiveFilters,
  onQChange,
  onTypeChange,
  onProjectClear,
  onClearFilters,
  searchInputRef,
}: InboxFilterBarProps) {
  const sourceQ = q ?? "";
  const [localQ, setLocalQ] = useSourceOverride(sourceQ, sourceQ);
  const debouncedQ = useDebouncedValue(localQ, 300);

  const onQChangeRef = React.useRef(onQChange);
  React.useLayoutEffect(() => {
    onQChangeRef.current = onQChange;
  });

  React.useEffect(() => {
    if (debouncedQ !== sourceQ) onQChangeRef.current(debouncedQ);
  }, [debouncedQ, sourceQ]);

  function handleValueChange(value: string) {
    setLocalQ(value);
  }

  function handleTypeSelectChange(value: string) {
    if (value === ALL_TYPES_SENTINEL) {
      onTypeChange(null);
      return;
    }
    if (isBuildInboxCategory(value)) onTypeChange(value);
  }

  function handleActiveSectionChange(value: string) {
    const option = BUILD_INBOX_ACTIVE_SECTIONS.find(
      (entry) => entry.value === value,
    );
    if (option) onSectionChange?.(option.value);
  }

  return (
    <BuildListToolbar
      collapseActionsOnSearchFocus
      className="shrink-0 flex-nowrap overflow-x-auto border-b border-border px-2 py-1.5 scrollbar-hide [&>[data-slot=search-input]]:md:max-w-none [&>[data-slot=build-toolbar-actions]]:shrink-0"
      search={{
        value: localQ,
        onValueChange: handleValueChange,
        placeholder: "Search notifications…",
        label: "Search notifications",
        inputRef: searchInputRef,
        inputClassName: "focus-visible:ring-1 focus-visible:ring-offset-0",
      }}
      filters={[
        ...(getBuildInboxTriageSection(section) === "ALL" && onSectionChange
          ? [
              {
                id: "attention",
                label: "Attention",
                active: section !== "ALL",
                control: (
                  <BuildFilterSelect
                    label="Filter active notifications"
                    value={section}
                    onValueChange={handleActiveSectionChange}
                    options={BUILD_INBOX_ACTIVE_SECTIONS}
                    className="md:min-w-28 md:max-w-32"
                  />
                ),
              },
            ]
          : []),
        {
          id: "type",
          label: "Category",
          active: type !== null,
          control: (
            <BuildFilterSelect
              label="Filter by category"
              value={type ?? ALL_TYPES_SENTINEL}
              onValueChange={handleTypeSelectChange}
              options={TYPE_OPTIONS}
              className="md:min-w-28 md:max-w-32"
            />
          ),
        },
      ]}
      trailing={
        <>
          {projectId !== null && onProjectClear ? (
            <button
              type="button"
              className="inline-flex h-8 max-w-36 shrink-0 items-center gap-1 rounded-md border border-border bg-muted/50 px-2 text-xs text-foreground hover:bg-muted"
              onClick={onProjectClear}
              aria-label={`Remove project filter (project ${projectId})`}
            >
              <span className="truncate">Project #{projectId}</span>
              <X
                className="h-3 w-3 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
          ) : null}
        </>
      }
      onClearAll={hasActiveFilters ? onClearFilters : undefined}
    />
  );
}
