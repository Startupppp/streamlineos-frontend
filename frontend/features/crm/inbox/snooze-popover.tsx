"use client";

import { useState, useCallback } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SnoozePopoverProps {
  taskId: number;
  onSnooze: (taskId: number, until: string) => void;
  isPending: boolean;
}

type SnoozeOption = {
  label: string;
  key: string;
  getUntil: () => string;
};

const SNOOZE_OPTIONS: SnoozeOption[] = [
  { key: "1h",        label: "1 hour",    getUntil: () => new Date(Date.now() + 60 * 60 * 1000).toISOString() },
  { key: "4h",        label: "4 hours",   getUntil: () => new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() },
  {
    key: "tomorrow",
    label: "Tomorrow",
    getUntil: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    },
  },
  {
    key: "nextweek",
    label: "Next week",
    getUntil: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    },
  },
];

function SnoozeOptionButton({
  opt,
  onSelect,
}: {
  opt: SnoozeOption;
  onSelect: (getUntil: () => string) => void;
}) {
  const handleClick = useCallback(() => onSelect(opt.getUntil), [opt.getUntil, onSelect]);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-full justify-start text-xs"
      onClick={handleClick}
    >
      {opt.label}
    </Button>
  );
}

export function SnoozePopover({ taskId, onSnooze, isPending }: SnoozePopoverProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (getUntil: () => string) => {
      onSnooze(taskId, getUntil());
      setOpen(false);
    },
    [taskId, onSnooze],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          disabled={isPending}
          aria-label="Snooze task"
        >
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="end">
        <div className="flex flex-col gap-0.5">
          {SNOOZE_OPTIONS.map((opt) => (
            <SnoozeOptionButton key={opt.key} opt={opt} onSelect={handleSelect} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
