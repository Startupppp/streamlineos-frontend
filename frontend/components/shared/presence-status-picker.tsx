"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePresenceSelection } from "@/hooks/common/use-presence-selection";
import {
  AUTO_PRESENCE_STATUSES,
  PRESENCE_LABELS,
  PRESENCE_STATUSES,
  presenceDotClass,
  type PresenceStatus,
} from "@/lib/presence";

const AUTO_STATUS: PresenceStatus = "ONLINE";
const AUTO_STATUS_HINT = "Set automatically from your activity";

const MANUAL_STATUSES = PRESENCE_STATUSES.filter(
  (status) => !AUTO_PRESENCE_STATUSES.includes(status),
);

interface PresenceStatusPickerProps {
  layout: "menu" | "list";
  className?: string;
}

export function PresenceStatusPicker({ layout, className }: PresenceStatusPickerProps) {
  const { status, selectStatus } = usePresenceSelection();

  return (
    <div className={cn("min-w-0", className)}>
      <PresenceOption
        status={AUTO_STATUS}
        current={status}
        hint={AUTO_STATUS_HINT}
        layout={layout}
        onSelect={selectStatus}
      />
      <div className="my-1 h-px bg-border" />
      {MANUAL_STATUSES.map((option) => (
        <PresenceOption
          key={option}
          status={option}
          current={status}
          layout={layout}
          onSelect={selectStatus}
        />
      ))}
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
