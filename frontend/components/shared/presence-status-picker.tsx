"use client";

import { useId, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  isPresenceClearAfter,
  presenceDotClass,
  type PresenceClearAfter,
  type PresenceStatus,
} from "@/lib/presence";

const AUTO_STATUS: PresenceStatus = "ONLINE";
const AUTO_STATUS_HINT = "Set automatically from your activity";
const DEFAULT_CLEAR_AFTER: PresenceClearAfter = "never";

const MANUAL_STATUSES = PRESENCE_STATUSES.filter(
  (status) => !AUTO_PRESENCE_STATUSES.includes(status),
);

interface PresenceStatusPickerProps {
  layout: "menu" | "list";
  className?: string;
}

export function PresenceStatusPicker({ layout, className }: PresenceStatusPickerProps) {
  const { status, statusMessage, statusExpiresAt, selectStatus, isPending } =
    usePresenceSelection();
  const messageInputId = useId();
  const clearAfterId = useId();
  const [syncedMessage, setSyncedMessage] = useState(statusMessage);
  const [messageDraft, setMessageDraft] = useState(statusMessage);
  const [clearAfter, setClearAfter] = useState<PresenceClearAfter>(DEFAULT_CLEAR_AFTER);

  if (syncedMessage !== statusMessage) {
    setSyncedMessage(statusMessage);
    setMessageDraft(statusMessage);
  }

  function handleStatusSelect(next: PresenceStatus) {
    selectStatus({ status: next, statusMessage: messageDraft, clearAfter });
  }

  function handleMessageChange(event: ChangeEvent<HTMLInputElement>) {
    setMessageDraft(event.target.value);
  }

  function handleClearAfterChange(value: string) {
    if (isPresenceClearAfter(value)) setClearAfter(value);
  }

  function handleFieldKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  function handleSave() {
    selectStatus({ status, statusMessage: messageDraft, clearAfter });
  }

  function handleClear() {
    setMessageDraft("");
    setClearAfter(DEFAULT_CLEAR_AFTER);
    selectStatus({ status, statusMessage: "", clearAfter: DEFAULT_CLEAR_AFTER });
  }

  const expiryLabel = formatDateTime(statusExpiresAt);

  return (
    <div className={cn("min-w-0", className)}>
      <PresenceOption
        status={AUTO_STATUS}
        current={status}
        hint={AUTO_STATUS_HINT}
        layout={layout}
        onSelect={handleStatusSelect}
      />
      <div className="my-1 h-px bg-border" />
      {MANUAL_STATUSES.map((option) => (
        <PresenceOption
          key={option}
          status={option}
          current={status}
          layout={layout}
          onSelect={handleStatusSelect}
        />
      ))}
      <div className="my-1 h-px bg-border" />
      <div
        className="flex flex-col gap-2 px-2 py-2"
        onKeyDown={handleFieldKeyDown}
      >
        <label
          htmlFor={messageInputId}
          className="text-micro font-medium uppercase tracking-wider text-muted-foreground"
        >
          Status message
        </label>
        <Input
          id={messageInputId}
          value={messageDraft}
          onChange={handleMessageChange}
          maxLength={PRESENCE_STATUS_MESSAGE_MAX_LENGTH}
          placeholder="Heads-down until 3pm"
        />
        <label
          htmlFor={clearAfterId}
          className="text-micro font-medium uppercase tracking-wider text-muted-foreground"
        >
          Clear after
        </label>
        <Select value={clearAfter} onValueChange={handleClearAfterChange}>
          <SelectTrigger id={clearAfterId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            {PRESENCE_CLEAR_AFTER_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {PRESENCE_CLEAR_AFTER_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isPending || (statusMessage === "" && messageDraft === "")}
          >
            Clear
          </Button>
          <LoadingButton type="button" size="sm" isPending={isPending} onClick={handleSave}>
            Save
          </LoadingButton>
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

interface PresenceOptionProps {
  status: PresenceStatus;
  current: PresenceStatus;
  hint?: string;
  layout: "menu" | "list";
  onSelect: (status: PresenceStatus) => void;
}

function PresenceOption({ status, current, hint, layout, onSelect }: PresenceOptionProps) {
  function handleSelect() {
    onSelect(status);
  }

  const isCurrent = status === current;
  const body = (
    <>
      <span className={cn("size-2 shrink-0 rounded-full", presenceDotClass(status))} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-xs">{PRESENCE_LABELS[status]}</span>
        {hint ? <span className="block text-micro text-muted-foreground">{hint}</span> : null}
      </span>
      {isCurrent ? <span className="text-micro text-muted-foreground">Current</span> : null}
    </>
  );

  if (layout === "menu") {
    return (
      <DropdownMenuItem onClick={handleSelect} className="gap-2 cursor-pointer">
        {body}
      </DropdownMenuItem>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSelect}
      aria-pressed={isCurrent}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted"
    >
      {body}
    </button>
  );
}
