"use client";

import { memo, useCallback } from "react";
import { Link2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { GLOBAL_SEARCH_MIN_LENGTH } from "@/components/command-palette/hooks/use-global-search";
import { LINKED_RECORD_META, type RecordSearchResult } from "./linked-record-meta";
import type { RecordPickerState } from "./use-message-composer";
import type { LinkedRecordDraft } from "./composer-draft";

export function recordOptionId(listboxId: string, index: number): string {
  return `${listboxId}-option-${index}`;
}

interface RecordOptionProps {
  record: RecordSearchResult;
  optionId: string;
  isActive: boolean;
  onSelect: (record: RecordSearchResult) => void;
}

const RecordOption = memo(function RecordOption({ record, optionId, isActive, onSelect }: RecordOptionProps) {
  const handleClick = useCallback(() => onSelect(record), [onSelect, record]);
  const handleMouseDown = useCallback((event: React.MouseEvent) => event.preventDefault(), []);
  const Icon = LINKED_RECORD_META[record.type].icon;
  return (
    <button
      type="button"
      role="option"
      id={optionId}
      aria-selected={isActive}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent transition-colors duration-100 ease-out motion-reduce:transition-none",
        isActive && "bg-accent",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <TruncatedText text={record.title} className="min-w-0 flex-1 text-label text-foreground" />
      {record.subtitle && (
        <span className="max-w-[40%] shrink-0 truncate text-dense text-muted-foreground">{record.subtitle}</span>
      )}
    </button>
  );
});

function PickerMessage({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-1 px-3 py-4 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

interface RecordLinkPickerProps {
  picker: RecordPickerState;
  listboxId: string;
  onSelect: (record: RecordSearchResult) => void;
  className?: string;
}

export function isRecordListboxShown(picker: RecordPickerState): boolean {
  return picker.query.trim().length >= GLOBAL_SEARCH_MIN_LENGTH && !picker.isError && picker.groups.length > 0;
}

export function RecordLinkPicker({ picker, listboxId, onSelect, className }: RecordLinkPickerProps) {
  const query = picker.query.trim();
  const hasResults = picker.groups.length > 0;
  const groupStarts = picker.groups.reduce<number[]>(
    (starts, group, index) => [...starts, index === 0 ? 0 : starts[index - 1] + picker.groups[index - 1].items.length],
    [],
  );

  return (
    <div
      className={cn(
        "absolute bottom-full mb-1 left-0 z-50 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border bg-popover shadow-lg",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        <Link2 className="h-3.5 w-3.5" aria-hidden />
        Link a record
        {picker.isSearching && query.length >= GLOBAL_SEARCH_MIN_LENGTH && (
          <span className="ml-auto text-micro">Searching…</span>
        )}
      </div>
      {query.length < GLOBAL_SEARCH_MIN_LENGTH ? (
        <PickerMessage>
          <Search className="h-4 w-4" aria-hidden />
          Type at least 2 characters to search CRM, Build, HR, Docs, Calendar and Support.
        </PickerMessage>
      ) : picker.isError ? (
        <PickerMessage>
          Can&apos;t search records right now.
          <Button type="button" variant="ghost" size="sm" onClick={picker.retry}>
            Try again
          </Button>
        </PickerMessage>
      ) : !hasResults ? (
        <PickerMessage>
          {picker.isSearching ? (
            "Searching records…"
          ) : (
            <>
              <span>No records match &ldquo;{query}&rdquo;.</span>
              <span>Only records you can open are shown.</span>
            </>
          )}
        </PickerMessage>
      ) : (
        <div id={listboxId} role="listbox" aria-label="Link a record" className="max-h-64 overflow-y-auto">
          {picker.groups.map((group, groupIndex) => {
            const start = groupStarts[groupIndex];
            const ModuleIcon = group.icon;
            return (
              <div key={group.module} role="group" aria-label={group.label}>
                <p
                  aria-hidden
                  className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-micro font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <ModuleIcon className="h-3 w-3" />
                  {group.label}
                </p>
                {group.items.map((record, itemIndex) => (
                  <RecordOption
                    key={`${record.type}:${record.id}`}
                    record={record}
                    optionId={recordOptionId(listboxId, start + itemIndex)}
                    isActive={start + itemIndex === picker.activeIndex}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface LinkedRecordChipProps {
  record: LinkedRecordDraft;
  onRemove: (key: string) => void;
}

const LinkedRecordChip = memo(function LinkedRecordChip({ record, onRemove }: LinkedRecordChipProps) {
  const handleRemove = useCallback(() => onRemove(record.key), [onRemove, record.key]);
  const Icon = LINKED_RECORD_META[record.type].icon;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-muted/50 py-1 pl-2.5 pr-1 text-dense">
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 max-w-[200px] truncate text-foreground/80">{record.title}</span>
      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Remove link to ${record.title}`}
        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
});

interface ChatLinkedRecordsRowProps {
  records: LinkedRecordDraft[];
  onRemove: (key: string) => void;
}

export function ChatLinkedRecordsRow({ records, onRemove }: ChatLinkedRecordsRowProps) {
  if (records.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {records.map((record) => (
        <LinkedRecordChip key={record.key} record={record} onRemove={onRemove} />
      ))}
    </div>
  );
}
