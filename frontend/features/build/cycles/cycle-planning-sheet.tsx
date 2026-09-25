"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { useBulkUpdateTickets } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Cycle, Ticket } from "@/types/projects";

interface CyclePlanningSheetProps {
  cycle: Cycle | null;
  tickets: Ticket[];
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TicketRow({ ticket, action, onClick }: { ticket: Ticket; action: "add" | "remove"; onClick: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{ticket.title}</p>
        <p className="text-xs text-muted-foreground">
          {ticket.ticketNumber ? `#${ticket.ticketNumber}` : "Ticket"}
          {ticket.points != null ? ` · ${ticket.points} pt` : ""}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClick} aria-label={`${action === "add" ? "Add" : "Remove"} ${ticket.title}`}>
        {action === "add" ? <Plus className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export function CyclePlanningSheet({ cycle, tickets, projectId, open, onOpenChange }: CyclePlanningSheetProps) {
  const [query, setQuery] = useState("");
  const [selectedBacklog, setSelectedBacklog] = useState<Set<number>>(new Set());
  const [selectedCycle, setSelectedCycle] = useState<Set<number>>(new Set());
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const cycleTickets = useMemo(
    () => cycle ? tickets.filter((ticket) => ticket.cycleId === cycle.id && ticket.type !== "EPIC") : [],
    [cycle, tickets],
  );
  const backlogTickets = useMemo(
    () => tickets.filter((ticket) => ticket.cycleId == null && ticket.type !== "EPIC"),
    [tickets],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleBacklog = normalizedQuery
    ? backlogTickets.filter((ticket) => ticket.title.toLowerCase().includes(normalizedQuery))
    : backlogTickets;
  const visibleCycleTickets = normalizedQuery
    ? cycleTickets.filter((ticket) => ticket.title.toLowerCase().includes(normalizedQuery))
    : cycleTickets;

  const moveTickets = (ticketIds: number[], cycleId: number | null) => {
    if (ticketIds.length === 0) return;
    bulkUpdate.mutate(
      { ticketIds, cycleId },
      {
        onSuccess: () => {
          if (cycleId === null) setSelectedCycle(new Set());
          else setSelectedBacklog(new Set());
          toast.success(`${ticketIds.length} ticket${ticketIds.length === 1 ? "" : "s"} updated`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-5">
          <SheetTitle>Plan {cycle?.name ?? "cycle"}</SheetTitle>
          <p className="text-sm text-muted-foreground">Move work between the backlog and this cycle.</p>
        </SheetHeader>
        <SheetBody className="min-h-0 space-y-4 overflow-y-auto px-6 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tickets" className="pl-9" aria-label="Search planning tickets" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-2" aria-labelledby="cycle-planning-backlog">
              <div className="flex items-center justify-between gap-2">
                <h3 id="cycle-planning-backlog" className="text-sm font-semibold">Backlog ({backlogTickets.length})</h3>
                <Button type="button" variant="outline" size="sm" disabled={bulkUpdate.isPending || selectedBacklog.size === 0} onClick={() => moveTickets([...selectedBacklog], cycle?.id ?? null)}>
                  Add selected
                </Button>
              </div>
              <div className="space-y-2">
                {visibleBacklog.map((ticket) => (
                  <div key={ticket.id} className="flex items-center gap-2">
                    <Button type="button" variant={selectedBacklog.has(ticket.id) ? "secondary" : "ghost"} size="icon" className="h-8 w-8 shrink-0" onClick={() => toggle(setSelectedBacklog, ticket.id)} aria-label={`${selectedBacklog.has(ticket.id) ? "Deselect" : "Select"} ${ticket.title}`}>
                      {selectedBacklog.has(ticket.id) ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 rounded border border-border" />}
                    </Button>
                    <div className="min-w-0 flex-1"><TicketRow ticket={ticket} action="add" onClick={() => moveTickets([ticket.id], cycle?.id ?? null)} /></div>
                  </div>
                ))}
                {visibleBacklog.length === 0 ? <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No backlog tickets match.</p> : null}
              </div>
            </section>
            <section className="space-y-2" aria-labelledby="cycle-planning-cycle">
              <div className="flex items-center justify-between gap-2">
                <h3 id="cycle-planning-cycle" className="text-sm font-semibold">{cycle?.name ?? "Cycle"} ({cycleTickets.length})</h3>
                <Button type="button" variant="outline" size="sm" disabled={bulkUpdate.isPending || selectedCycle.size === 0} onClick={() => moveTickets([...selectedCycle], null)}>
                  Remove selected
                </Button>
              </div>
              <div className="space-y-2">
                {visibleCycleTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center gap-2">
                    <Button type="button" variant={selectedCycle.has(ticket.id) ? "secondary" : "ghost"} size="icon" className="h-8 w-8 shrink-0" onClick={() => toggle(setSelectedCycle, ticket.id)} aria-label={`${selectedCycle.has(ticket.id) ? "Deselect" : "Select"} ${ticket.title}`}>
                      {selectedCycle.has(ticket.id) ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 rounded border border-border" />}
                    </Button>
                    <div className="min-w-0 flex-1"><TicketRow ticket={ticket} action="remove" onClick={() => moveTickets([ticket.id], null)} /></div>
                  </div>
                ))}
                {visibleCycleTickets.length === 0 ? <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No tickets in this cycle.</p> : null}
              </div>
            </section>
          </div>
        </SheetBody>
        <SheetFooter className="shrink-0 border-t px-6 py-3">
          <LoadingButton type="button" variant="outline" onClick={() => onOpenChange(false)} isPending={bulkUpdate.isPending} loadingText="Saving...">Done</LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
