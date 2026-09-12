"use client";

import { memo, useState, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Loader2 } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTicketSearch } from "@/hooks/api/build";
import type { TicketSearchResult } from "@/hooks/api/build";
import { TruncatedText } from "@/components/ui/truncated-text";

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
      <span className="font-mono text-dense text-muted-foreground shrink-0 w-16 truncate">
        {ticket.projectKey}-{ticket.ticketNumber}
      </span>
      <TruncatedText text={ticket.title} className="text-label flex-1 min-w-0 text-foreground" />
    </button>
  );
});

function TicketPickerBody({
  onSelect,
}: {
  onSelect: (ticket: TicketSearchResult) => void;
}) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const { data: tickets = [], isLoading } = useTicketSearch(debouncedQ);

  const handleSearchChange = useCallback((value: string) => {
    setQ(value);
  }, []);

  return (
    <div className="flex-1 min-h-0 px-4 py-2 flex flex-col gap-2">
      <SearchInput
        fill
        autoFocus
        className="shrink-0"
        value={q}
        onValueChange={handleSearchChange}
        placeholder="Search by ticket key or title…"
        aria-label="Search tickets"
      />
      <div className="overflow-y-auto space-y-0.5 max-h-[min(40dvh,20rem)]">
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
