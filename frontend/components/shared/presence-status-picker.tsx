"use client";

import {
  useId,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { Input } from "@/components/ui/input";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date-utils";
import { usePresenceSelection } from "@/hooks/common/use-presence-selection";
import {
  AUTO_PRESENCE_STATUSES,
  PRESENCE_CLEAR_AFTER_LABELS,
  PRESENCE_CLEAR_AFTER_OPTIONS,
  PRESENCE_LABELS,
  PRESENCE_STATUSES,
  PRESENCE_STATUS_MESSAGE_MAX_LENGTH,
  presenceDotClass,
  type PresenceClearAfter,
  type PresenceStatus,
} from "@/lib/presence";

const AUTO_STATUS: PresenceStatus = "ONLINE";
const DEFAULT_CLEAR_AFTER: PresenceClearAfter = "never";

const MANUAL_STATUSES = PRESENCE_STATUSES.filter(
  (status) => !AUTO_PRESENCE_STATUSES.includes(status),
);

const PICKER_STATUSES: PresenceStatus[] = [AUTO_STATUS, ...MANUAL_STATUSES];

const CHIP_ROW =
  "flex w-full min-w-0 max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto overscroll-x-contain scrollbar-hide touch-pan-x";

const STATUS_CHIP_MENU =
  "h-6 w-auto shrink-0 gap-1 rounded-md border border-border bg-card py-0 pl-1.5 pr-1.5 text-micro font-medium whitespace-nowrap text-muted-foreground shadow-none focus:bg-muted focus:text-foreground data-[state=checked]:border-primary/30 data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground [&>span:first-child]:hidden";

const STATUS_CHIP_LIST =
  "inline-flex h-6 w-auto shrink-0 items-center gap-1 rounded-md border px-1.5 text-micro font-medium whitespace-nowrap transition-colors";

const DURATION_CHIP_MENU =
  "h-5 w-auto shrink-0 rounded-md border-0 bg-transparent py-0 pl-1.5 pr-1.5 text-micro font-medium whitespace-nowrap text-muted-foreground shadow-none focus:bg-muted focus:text-foreground data-[state=checked]:bg-muted data-[state=checked]:text-foreground [&>span:first-child]:hidden";

function revealChip(event: FocusEvent<HTMLElement>) {
  const row = event.currentTarget.parentElement;
  if (!row) return;
  const rowRect = row.getBoundingClientRect();
  const chipRect = event.currentTarget.getBoundingClientRect();
  if (chipRect.left < rowRect.left) {
    row.scrollLeft -= rowRect.left - chipRect.left + 8;
  } else if (chipRect.right > rowRect.right) {
    row.scrollLeft += chipRect.right - rowRect.right + 8;
  }
}

interface PresenceStatusPickerProps {
  layout: "menu" | "list";
  className?: string;
}

export function PresenceStatusPicker({ layout, className }: PresenceStatusPickerProps) {
  const { status, statusMessage, statusExpiresAt, selectStatus, isPending } =
    usePresenceSelection();
  const messageInputId = useId();
  const [messageDraft, setMessageDraft] = useSourceOverride(statusMessage, statusMessage);
  const [clearAfter, setClearAfter] = useState<PresenceClearAfter>(DEFAULT_CLEAR_AFTER);

  function commit(next: {
    status: PresenceStatus;
    statusMessage: string;
    clearAfter: PresenceClearAfter;
  }) {
    selectStatus(next);
  }

  function handleStatusSelect(next: PresenceStatus) {
    commit({ status: next, statusMessage: messageDraft, clearAfter });
  }

  function handleMessageChange(event: ChangeEvent<HTMLInputElement>) {
    setMessageDraft(event.target.value);
  }

  function handleMessageBlur() {
    if (messageDraft === statusMessage) return;
    commit({ status, statusMessage: messageDraft, clearAfter });
  }

  function handleMessageKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();
    if (event.key !== "Enter") return;
    event.currentTarget.blur();
  }

  function handleClearAfterSelect(next: PresenceClearAfter) {
    setClearAfter(next);
    commit({ status, statusMessage: messageDraft, clearAfter: next });
  }

  function handleStatusValueChange(next: string) {
    const match = PICKER_STATUSES.find((option) => option === next);
    if (match) handleStatusSelect(match);
  }

  function handleClearAfterValueChange(next: string) {
    const match = PRESENCE_CLEAR_AFTER_OPTIONS.find((option) => option === next);
    if (match) handleClearAfterSelect(match);
  }

  function keepMenuOpen(event: Event) {
    event.preventDefault();
  }

  function handleFieldPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  function handleFieldKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  const expiryLabel = formatDateTime(statusExpiresAt);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        layout === "menu" ? "px-1 py-1" : "px-2 py-1.5",
        className,
      )}
      data-vaul-no-drag=""
      onPointerDown={handleFieldPointerDown}
      onKeyDown={layout === "menu" ? undefined : handleFieldKeyDown}
    >
      {layout === "menu" ? (
        <DropdownMenuRadioGroup
          value={status}
          onValueChange={handleStatusValueChange}
          aria-label="Availability"
          className={CHIP_ROW}
        >
          {PICKER_STATUSES.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              disabled={isPending}
              onSelect={keepMenuOpen}
              onFocus={revealChip}
              className={STATUS_CHIP_MENU}
            >
              <span className={cn("size-1 shrink-0 rounded-full", presenceDotClass(option))} />
              {PRESENCE_LABELS[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      ) : (
        <div className={CHIP_ROW} role="group" aria-label="Availability">
          {PICKER_STATUSES.map((option) => (
            <PresenceStatusChip
              key={option}
              status={option}
              current={status}
              disabled={isPending}
              onSelect={handleStatusSelect}
            />
          ))}
        </div>
      )}
      <label htmlFor={messageInputId} className="sr-only">
        Status message
      </label>
      <Input
        id={messageInputId}
        value={messageDraft}
        onChange={handleMessageChange}
        onBlur={handleMessageBlur}
        onKeyDown={handleMessageKeyDown}
        maxLength={PRESENCE_STATUS_MESSAGE_MAX_LENGTH}
        placeholder="What's your status?"
        disabled={isPending}
        className="h-7 px-2 text-dense"
      />
      {layout === "menu" ? (
        <DropdownMenuRadioGroup
          value={clearAfter}
          onValueChange={handleClearAfterValueChange}
          aria-label="Clear after"
          className={CHIP_ROW}
        >
          {PRESENCE_CLEAR_AFTER_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              disabled={isPending}
              onSelect={keepMenuOpen}
              onFocus={revealChip}
              className={DURATION_CHIP_MENU}
            >
              {PRESENCE_CLEAR_AFTER_LABELS[option]}
            </DropdownMenuRadioItem>
          ))}
          {statusMessage ? (
            <p className="shrink-0 px-1 text-micro whitespace-nowrap text-muted-foreground">
              {expiryLabel ? `Clears ${expiryLabel}` : "Stays until you clear it"}
            </p>
          ) : null}
        </DropdownMenuRadioGroup>
      ) : (
        <div className={CHIP_ROW} role="group" aria-label="Clear after">
          {PRESENCE_CLEAR_AFTER_OPTIONS.map((option) => (
            <PresenceDurationChip
              key={option}
              value={option}
              current={clearAfter}
              disabled={isPending}
              onSelect={handleClearAfterSelect}
            />
          ))}
          {statusMessage ? (
            <p className="shrink-0 px-1 text-micro whitespace-nowrap text-muted-foreground">
              {expiryLabel ? `Clears ${expiryLabel}` : "Stays until you clear it"}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

interface PresenceStatusChipProps {
  status: PresenceStatus;
  current: PresenceStatus;
  disabled: boolean;
  onSelect: (status: PresenceStatus) => void;
}

function PresenceStatusChip({
  status,
  current,
  disabled,
  onSelect,
}: PresenceStatusChipProps) {
  const isCurrent = status === current;

  function handleSelect() {
    onSelect(status);
  }

  return (
    <button
      type="button"
      onClick={handleSelect}
      onFocus={revealChip}
      disabled={disabled}
      aria-pressed={isCurrent}
      aria-label={PRESENCE_LABELS[status]}
      className={cn(
        STATUS_CHIP_LIST,
        isCurrent
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className={cn("size-1 shrink-0 rounded-full", presenceDotClass(status))} />
      {PRESENCE_LABELS[status]}
    </button>
  );
}

interface PresenceDurationChipProps {
  value: PresenceClearAfter;
  current: PresenceClearAfter;
  disabled: boolean;
  onSelect: (value: PresenceClearAfter) => void;
}

function PresenceDurationChip({
  value,
  current,
  disabled,
  onSelect,
}: PresenceDurationChipProps) {
  const isCurrent = value === current;

  function handleSelect() {
    onSelect(value);
  }

  return (
    <button
      type="button"
      onClick={handleSelect}
      onFocus={revealChip}
      disabled={disabled}
      aria-pressed={isCurrent}
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-micro font-medium whitespace-nowrap transition-colors",
        isCurrent
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {PRESENCE_CLEAR_AFTER_LABELS[value]}
    </button>
  );
}
