"use client";

import { memo, useState, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTicketSearch } from "@/hooks/api/projects";
import type { TicketSearchResult } from "@/hooks/api/projects";

interface TicketPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (ticket: TicketSearchResult) => void;
}

interface TicketRowProps {
  ticket: TicketSearchResult;
  onSelect: (ticket: TicketSearchResult) => void;
}

const TicketRow = memo(function TicketRow({ ticket, onSelect }: TicketRowProps) {
  const handleClick = useCallback(() => onSelect(ticket), [ticket, onSelect]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center gap-2 px-3 h-8 rounded-md text-left hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent"
    >
      <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-16 truncate">
        {ticket.projectKey}-{ticket.ticketNumber}
      </span>
      <span className="text-[13px] flex-1 min-w-0 truncate text-foreground">
        {ticket.title}
      </span>
    </button>
  );
});

function TicketPickerBody({
  onSelect,
}: {
  onSelect: (ticket: TicketSearchResult) => void;
}) {
  const [q, setQ] = useState("");
  const { data: tickets = [], isLoading } = useTicketSearch(q);

  const handleQChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQ(e.target.value);
    },
    [],
  );

  return (
    <div className="flex-1 min-h-0 px-4 py-2 flex flex-col gap-2">
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={handleQChange}
          placeholder="Search by ticket key or title…"
          className="w-full h-8 pl-8 pr-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>
      <div className="overflow-y-auto space-y-0.5 max-h-[min(40vh,20rem)]">
        {isLoading ? (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching…
          </div>
        ) : tickets.length === 0 && q ? (
          <div className="py-2 text-xs text-muted-foreground">
            No tickets found
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}

export const TicketPickerDialog = memo(function TicketPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: TicketPickerDialogProps) {
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      onOpenChange(isOpen);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 pb-0 md:pb-0 flex flex-col overflow-hidden rounded-xl">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base font-semibold">
            Link a ticket
          </DialogTitle>
        </DialogHeader>
        <TicketPickerBody onSelect={onSelect} />
      </DialogContent>
    </Dialog>
  );
});
