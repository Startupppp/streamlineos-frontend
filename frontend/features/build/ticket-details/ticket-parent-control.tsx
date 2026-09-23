"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronsUpDown, CornerLeftUp, Search } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { useTicketSearch } from "@/hooks/api/build/ticket-search";
import { useUpdateTicket } from "@/hooks/api";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  COMPACT_SEARCH_POPOVER_CONTENT_CLASS,
  FIELD_CONTROL_CLASS,
  FIELD_SEARCH_POPOVER_CONTENT_CLASS,
} from "@/components/ui/field-control";
import { TicketParentLink } from "./ticket-parent-link";
import type { Ticket } from "@/types/projects";

type TicketParentControlVariant = "field" | "breadcrumb";

interface TicketParentControlProps {
  ticket: Pick<Ticket, "id" | "parentTicketId">;
  projectId: number;
  projectKey?: string | null;
  variant?: TicketParentControlVariant;
}

const PARENT_TRIGGER_CLASS = cn(
  FIELD_CONTROL_CLASS,
  "flex w-full touch-manipulation items-center gap-1.5 text-left hover:bg-accent",
);

export function TicketParentControl({
  ticket,
  projectId,
  projectKey,
  variant = "field",
}: TicketParentControlProps) {
  const canEdit = useCan("build:tickets:update");
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQ("");
  }

  const picker = (
    <ResponsivePopoverContent
      title="Parent ticket"
      align="start"
      className={cn(
        "p-0",
        hasParent
          ? COMPACT_SEARCH_POPOVER_CONTENT_CLASS
          : FIELD_SEARCH_POPOVER_CONTENT_CLASS,
      )}
    >
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
              <span className="shrink-0 font-mono text-micro text-muted-foreground">
                {r.projectKey}-{r.ticketNumber}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs">{r.title}</span>
            </button>
          ))
        )}
      </div>
    </ResponsivePopoverContent>
  );

  if (variant === "breadcrumb") {
    if (!hasParent) return null;
    return (
      <TicketParentLink
        parentTicketId={ticket.parentTicketId}
        projectId={projectId}
        projectKey={projectKey}
        density="compact"
      />
    );
  }

  if (!canEdit) {
    if (!hasParent) {
      return (
        <div className="min-w-0">
          <span className="mb-1 block text-micro font-medium uppercase tracking-wide text-muted-foreground">
            Parent
          </span>
          <p className="text-xs text-muted-foreground">None</p>
        </div>
      );
    }
    return (
      <div className="min-w-0">
        <span className="mb-1 block text-micro font-medium uppercase tracking-wide text-muted-foreground">
          Parent
        </span>
        <TicketParentLink
          parentTicketId={ticket.parentTicketId}
          projectId={projectId}
          projectKey={projectKey}
          density="field"
        />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <span className="mb-1 block text-micro font-medium uppercase tracking-wide text-muted-foreground">
        Parent
      </span>
      <div className="flex min-w-0 items-center gap-1">
        {hasParent ? (
          <>
            <div
              className={cn(
                PARENT_TRIGGER_CLASS,
                "min-w-0 flex-1 justify-between gap-1 pr-1.5",
              )}
            >
              <TicketParentLink
                parentTicketId={ticket.parentTicketId}
                projectId={projectId}
                projectKey={projectKey}
                density="field"
                className="min-w-0 flex-1 px-0 hover:bg-transparent"
              />
              <ResponsivePopover open={open} onOpenChange={handleOpenChange}>
                <ResponsivePopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    disabled={updateTicket.isPending}
                    aria-label="Change parent"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </button>
                </ResponsivePopoverTrigger>
                {picker}
              </ResponsivePopover>
            </div>
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              icon={XIcon}
              iconSize={14}
              className="h-9 w-9 shrink-0 touch-manipulation text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
              disabled={updateTicket.isPending}
              aria-label="Remove parent"
            />
          </>
        ) : (
          <ResponsivePopover open={open} onOpenChange={handleOpenChange}>
            <ResponsivePopoverTrigger asChild>
              <button
                type="button"
                className={cn(PARENT_TRIGGER_CLASS, "text-muted-foreground")}
                disabled={updateTicket.isPending}
              >
                <CornerLeftUp className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">Add parent</span>
              </button>
            </ResponsivePopoverTrigger>
            {picker}
          </ResponsivePopover>
        )}
      </div>
    </div>
  );
}
