"use client";

import { useId, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from "react";
import {
  BellOff,
  Circle,
  Clock,
  Home,
  MinusCircle,
  Plane,
  TreePalm,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

const STATUS_ICONS: Record<PresenceStatus, LucideIcon> = {
  ONLINE: Circle,
  AWAY: Clock,
  OFFLINE: Circle,
  BUSY: MinusCircle,
  DO_NOT_DISTURB: BellOff,
  IN_A_MEETING: Video,
  ON_LEAVE: TreePalm,
  VACATION: Plane,
  WORKING_REMOTELY: Home,
};

interface PresenceStatusPickerProps {
  layout: "menu" | "list";
  className?: string;
}

export function PresenceStatusPicker({ layout, className }: PresenceStatusPickerProps) {
  const { status, statusMessage, statusExpiresAt, selectStatus, isPending } =
    usePresenceSelection();
  const messageInputId = useId();
  const [syncedMessage, setSyncedMessage] = useState(statusMessage);
  const [messageDraft, setMessageDraft] = useState(statusMessage);
  const [clearAfter, setClearAfter] = useState<PresenceClearAfter>(DEFAULT_CLEAR_AFTER);

  if (syncedMessage !== statusMessage) {
    setSyncedMessage(statusMessage);
    setMessageDraft(statusMessage);
  }

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

  function handleFieldPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  function handleFieldKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  const expiryLabel = formatDateTime(statusExpiresAt);
  const pickerStatuses: PresenceStatus[] = [AUTO_STATUS, ...MANUAL_STATUSES];

  return (
    <div
      className={cn(
        "min-w-0",
        layout === "menu" ? "px-1 py-1" : "px-2 py-1.5",
        className,
      )}
      data-vaul-no-drag=""
      onPointerDown={handleFieldPointerDown}
      onKeyDown={handleFieldKeyDown}
    >
      <div className="flex flex-wrap gap-1">
        {pickerStatuses.map((option) => (
          <PresenceStatusChip
            key={option}
            status={option}
            current={status}
            disabled={isPending}
            onSelect={handleStatusSelect}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
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
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Clear after">
          {PRESENCE_CLEAR_AFTER_OPTIONS.map((option) => (
            <PresenceDurationChip
              key={option}
              value={option}
              current={clearAfter}
              disabled={isPending}
              onSelect={handleClearAfterSelect}
            />
          ))}
        </div>
        {statusMessage ? (
          <p className="text-micro text-muted-foreground">
            {expiryLabel ? `Clears ${expiryLabel}` : "Stays until you clear it"}
          </p>
        ) : null}
      </div>
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
  const Icon = STATUS_ICONS[status];
  const isCurrent = status === current;

  function handleSelect() {
    onSelect(status);
  }

  return (
    <button
      type="button"
      onClick={handleSelect}
      disabled={disabled}
      aria-pressed={isCurrent}
      aria-label={PRESENCE_LABELS[status]}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors",
        isCurrent
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", presenceDotClass(status))} />
      <Icon className="h-3 w-3 shrink-0" />
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
      disabled={disabled}
      aria-pressed={isCurrent}
      className={cn(
        "inline-flex h-6 items-center rounded-md px-1.5 text-micro font-medium transition-colors",
        isCurrent
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {PRESENCE_CLEAR_AFTER_LABELS[value]}
    </button>
  );
}
