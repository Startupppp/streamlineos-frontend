"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Input } from "@/components/ui/input";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { useTicketSearch } from "@/hooks/api/build/ticket-search";
import { cn } from "@/lib/utils";

interface ParentPickerPopoverProps {
  projectId: number;
  excludeIds: Set<string | number>;
  onPick: (id: number | null) => void;
}

export function ParentPickerPopover({
  projectId,
  excludeIds,
  onPick,
}: ParentPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results } = useTicketSearch(q, {
    enabled: open,
  });

  const filtered = (results ?? []).filter(
    (r) => r.projectId === projectId && !excludeIds.has(r.id),
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleRemoveParent() {
    onPick(null);
    setOpen(false);
  }

  function handlePickResult(id: number) {
    onPick(id);
    setOpen(false);
  }

  return (
    <ResponsivePopover open={open} onOpenChange={handleOpenChange}>
      <ResponsivePopoverTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          Set parent
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent title="Set parent" className="w-72 p-2" align="start">
        <Input
          ref={inputRef}
          placeholder="Search tickets…"
          aria-label="Search parent tickets"
          value={q}
          onChange={handleInputChange}
          className="mb-2"
        />
        <div className="max-h-52 overflow-y-auto">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent"
            onClick={handleRemoveParent}
          >
            Remove parent
          </button>
          {filtered.length === 0 && q.length > 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No tickets found.</p>
          ) : null}
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
              onClick={() => handlePickResult(r.id)}
            >
              <span className="shrink-0 font-mono text-micro text-muted-foreground">
                {r.projectKey}-{r.ticketNumber}
              </span>
              <span className={cn("flex-1 text-xs", TEXT_ONE_LINE)}>{r.title}</span>
            </button>
          ))}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
