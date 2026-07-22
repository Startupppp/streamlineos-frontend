"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CornerLeftUp, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTicketSearch } from "@/hooks/api/projects/ticket-search";
import { useUpdateTicket } from "@/hooks/api";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { TicketParentLink } from "./ticket-parent-link";
import type { Ticket } from "@/types/projects";

interface TicketParentControlProps {
  ticket: Ticket;
  projectId: number;
  projectKey?: string | null;
}

export function TicketParentControl({ ticket, projectId, projectKey }: TicketParentControlProps) {
  const canEdit = useCan("projects:tickets:update");
  const updateTicket = useUpdateTicket(projectId);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 250);
  const { data: results, isFetching } = useTicketSearch(debounced, {
    enabled: open && debounced.trim().length > 0,
  });

  const hasParent = ticket.parentTicketId != null;

  const matches = useMemo(
    () =>
      (results ?? []).filter(
        (r) => r.projectId === projectId && r.id !== ticket.id && r.id !== ticket.parentTicketId,
      ),
    [results, projectId, ticket.id, ticket.parentTicketId],
  );

  function setParent(parentTicketId: number | null) {
    updateTicket.mutate(
      { ticketId: ticket.id, parentTicketId },
      {
        onSuccess: () => {
          toast.success(parentTicketId ? "Parent set" : "Parent removed");
          setOpen(false);
          setQ("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleRemove() {
    setParent(null);
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
  }

  if (!canEdit) {
    return hasParent ? (
      <TicketParentLink
        parentTicketId={ticket.parentTicketId}
        projectId={projectId}
        projectKey={projectKey}
      />
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasParent ? (
        <>
          <TicketParentLink
            parentTicketId={ticket.parentTicketId}
            projectId={projectId}
            projectKey={projectKey}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={handleRemove}
            disabled={updateTicket.isPending}
            aria-label="Remove parent"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <CornerLeftUp className="h-3.5 w-3.5" />
            {hasParent ? "Change parent" : "Add parent"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="flex items-center gap-2 border-b px-2.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={q}
              onChange={handleQueryChange}
              placeholder="Search tickets to set as parent…"
              className="h-7 border-0 p-0 text-xs shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {debounced.trim().length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">Type to search…</p>
            ) : isFetching && matches.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">Searching…</p>
            ) : matches.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No matching tickets in this project
              </p>
            ) : (
              matches.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setParent(r.id)}
                  disabled={updateTicket.isPending}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
                    {r.projectKey}-{r.ticketNumber}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs">{r.title}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
