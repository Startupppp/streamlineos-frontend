"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan, useCanState } from "@/hooks/api/access";
import { useProject } from "@/hooks/api";
import {
  useChangeRequestAffectedTickets,
  useLinkAffectedTicket,
  useUnlinkAffectedTicket,
} from "@/hooks/api/build/change-request-affected-items";
import { useTicketSearch } from "@/hooks/api/build/ticket-search";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { ErrorState } from "@/components/shared/error-state";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import type { ChangeRequestAffectedItem } from "@/types/projects";

interface ChangeRequestAffectedTicketsProps {
  projectId: number;
  changeRequestId: number;
}

function stopProp(e: React.MouseEvent | React.KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function RemoveTicketButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleClick(e: React.MouseEvent) {
    stopProp(e);
    onClick();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={stopProp}
      aria-label="Unlink ticket"
      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 hover:bg-muted/60"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={12} />
    </button>
  );
}

interface AffectedTicketRowProps {
  item: ChangeRequestAffectedItem;
  projectId: number;
  projectKey: string | null | undefined;
  endAction?: React.ReactNode;
}

function AffectedTicketRow({ item, projectId, projectKey, endAction }: AffectedTicketRowProps) {
  const href = getTicketDetailHref(projectId, projectKey, item.ticket.ticketNumber);
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-1.5 hover:bg-muted/60 transition-colors"
    >
      <StatusBadge status={item.ticket.status} className="shrink-0" />
      <span className="text-micro font-mono text-muted-foreground shrink-0 select-none">
        #{item.ticket.ticketNumber}
      </span>
      <span
        className="min-w-0 max-w-full flex-1 truncate text-xs [overflow-wrap:anywhere]"
        title={item.ticket.title}
      >
        {item.ticket.title}
      </span>
      <Badge variant="secondary" className="shrink-0 h-4 px-1.5 py-0 text-micro">
        {item.ticket.priority}
      </Badge>
      {endAction}
    </Link>
  );
}

export function ChangeRequestAffectedTickets({
  projectId,
  changeRequestId,
}: ChangeRequestAffectedTicketsProps) {
  const canManage = useCan("build:changerequests:manage");
  const accessState = useCanState("build:changerequests:view");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pageLimit, setPageLimit] = useState(25);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: projectData } = useProject(projectId);
  const { data, isLoading, isError, error, refetch } = useChangeRequestAffectedTickets(
    projectId,
    changeRequestId,
    { limit: pageLimit },
  );
  const { data: searchResults } = useTicketSearch(debouncedSearch, {
    enabled: pickerOpen && canManage && debouncedSearch.length > 0,
  });
  const link = useLinkAffectedTicket(projectId, changeRequestId);
  const unlink = useUnlinkAffectedTicket(projectId, changeRequestId);

  if (accessState === "denied" || accessState === "loading") return null;

  const affectedItems = useMemo(() => data?.data ?? [], [data]);
  const linkedTicketIds = useMemo(
    () => new Set(affectedItems.map((item) => item.ticketId)),
    [affectedItems],
  );
  const candidates = (searchResults ?? []).filter(
    (t) => t.projectId === projectId && !linkedTicketIds.has(t.id),
  );

  function handleLink(ticketId: number) {
    link.mutate(
      { ticketId },
      {
        onSuccess: () => {
          toast.success("Ticket linked");
          setSearch("");
          setPickerOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleUnlink(affectedItemId: number) {
    unlink.mutate(affectedItemId, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRetry() {
    void refetch();
  }

  function handleLoadMore() {
    setPageLimit((prev) => Math.min(prev + 25, 100));
  }

  if (isLoading) return null;

  if (isError) {
    return (
      <ErrorState
        compact
        title="Couldn't load affected tickets"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          Affected Tickets
        </h4>
        {canManage ? (
          <ResponsivePopover open={pickerOpen} onOpenChange={setPickerOpen}>
            <ResponsivePopoverTrigger asChild>
              <AnimatedIconButton
                variant="outline"
                size="sm"
                icon={PlusIcon}
                iconSize={12}
                iconClassName="mr-1"
                className="px-2 bg-muted/50 hover:bg-muted"
              >
                Link
              </AnimatedIconButton>
            </ResponsivePopoverTrigger>
            <ResponsivePopoverContent title="Link ticket" className="w-80 p-3 space-y-3" align="end">
              <p className="text-xs font-medium">Link a Ticket</p>
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search tickets…"
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList className="max-h-[200px]">
                  <CommandEmpty className="py-2 text-xs text-muted-foreground text-center">
                    {search ? "No tickets found." : "Type to search tickets."}
                  </CommandEmpty>
                  <CommandGroup>
                    {candidates.map((t) => (
                      <CommandItem
                        key={t.id}
                        value={String(t.id)}
                        onSelect={() => handleLink(t.id)}
                        disabled={link.isPending}
                        className="text-xs"
                      >
                        <span className="font-mono text-muted-foreground mr-2">#{t.ticketNumber}</span>
                        <span className="truncate">{t.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </ResponsivePopoverContent>
          </ResponsivePopover>
        ) : null}
      </div>

      {affectedItems.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No affected tickets yet.</p>
      ) : (
        <div className="space-y-1">
          {affectedItems.map((item) => (
            <AffectedTicketRow
              key={item.id}
              item={item}
              projectId={projectId}
              projectKey={projectData?.key}
              endAction={
                canManage ? <RemoveTicketButton onClick={() => handleUnlink(item.id)} /> : undefined
              }
            />
          ))}
          <InfiniteScrollSentinel
            hasNextPage={data?.pagination.hasMore ?? false}
            isFetchingNextPage={isLoading}
            onLoadMore={handleLoadMore}
            label="Load more affected tickets"
          />
        </div>
      )}
    </div>
  );
}
