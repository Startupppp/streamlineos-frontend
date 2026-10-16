"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { CursorPageResponse } from "@/types/projects";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ListChecks, Link } from "lucide-react";
import { useProject } from "@/hooks/api/build/projects";
import { SubtaskRow } from "./subtask-row";
import { SubtaskComposer } from "./subtask-composer";
import { TicketAiSuggestSubtasksAction } from "@/features/build/ai/ticket-detail-ai";
import type { Ticket } from "@/types/projects";
import type { ProjectStatusRecord } from "@/types/projects";
import { isCompletedTicketStatus } from "@/features/build/shared/completed-status";
import { useCan } from "@/hooks/api/access";
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import { useTicketSearch } from "@/hooks/api/build/ticket-search";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LinkIcon } from "@animateicons/react/lucide";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface TicketSubtasksProps {
  ticketId: number;
  projectId: number;
  subtasks: Ticket[];
  parentTicketId?: number | null;
  canUseAI?: boolean;
}

function ExistingTicketLinker({
  ticketId,
  projectId,
  excludeIds,
}: {
  ticketId: number;
  projectId: number;
  excludeIds: Set<number>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 300);
  const updateTicket = useUpdateTicket(projectId);
  const queryClient = useQueryClient();

  const { data: results, isFetching } = useTicketSearch(debounced, {
    enabled: open && debounced.trim().length > 0,
  });

  const candidates = useMemo(
    () =>
      (results ?? []).filter(
        (r) => r.projectId === projectId && !excludeIds.has(r.id),
      ),
    [results, projectId, excludeIds],
  );

  function handleSelect(result: NonNullable<typeof results>[number]) {
    updateTicket.mutate(
      { ticketId: result.id, version: result.version, parentTicketId: ticketId },
      {
        onSuccess: () => {
          const subtaskKey = buildWorkQueryKeys.projects.subtasks(ticketId, projectId);
          const cachedTicket = queryClient.getQueryData<Ticket>(
            buildWorkQueryKeys.projects.ticket(projectId, result.id),
          );
          if (cachedTicket) {
            queryClient.setQueryData<Ticket[]>(
              subtaskKey,
              (prev) => (prev ? [...prev, cachedTicket] : [cachedTicket]),
            );
          } else {
            const ticketCollections = queryClient.getQueriesData<
              CursorPageResponse<Ticket> | InfiniteData<CursorPageResponse<Ticket>>
            >({ queryKey: buildWorkQueryKeys.projects.tickets({ projectId }) });
            let foundTicket: Ticket | undefined;
            for (const [, col] of ticketCollections) {
              if (!col) continue;
              const pageTickets = "pages" in col
                ? col.pages.flatMap((p) => p.data)
                : col.data;
              const match = pageTickets.find((t) => t.id === result.id);
              if (match) { foundTicket = match; break; }
            }
            const ticketToAdd = foundTicket;
            if (ticketToAdd !== undefined) {
              queryClient.setQueryData<Ticket[]>(
                subtaskKey,
                (prev) => (prev ? [...prev, ticketToAdd] : [ticketToAdd]),
              );
            } else {
              void queryClient.invalidateQueries({
                queryKey: subtaskKey,
                exact: true,
                refetchType: "active",
              });
            }
          }
          toast.success("Subtask linked");
          setOpen(false);
          setQ("");
        },
        onError: (e) => {
          toast.error(getErrorMessage(e));
        },
      },
    );
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQ("");
  }

  return (
    <ResponsivePopover open={open} onOpenChange={handleOpenChange}>
      <ResponsivePopoverTrigger asChild>
        <AnimatedIconButton
          type="button"
          variant="ghost"
          size="sm"
          icon={LinkIcon}
          iconSize={13}
          iconClassName="mr-1"
          className="h-7 text-xs text-muted-foreground"
        >
          Link existing
        </AnimatedIconButton>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="Link existing ticket"
        align="start"
        className="w-72 p-0"
      >
        <Command shouldFilter={false} className="rounded-none bg-transparent">
          <CommandInput
            value={q}
            onValueChange={setQ}
            placeholder="Search tickets to link…"
            autoFocus
            className="h-9 text-xs"
          />
          <CommandList className="max-h-56">
            {debounced.trim().length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                <Link className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Search this project for a ticket to add as a subtask
                </span>
              </div>
            ) : isFetching && candidates.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                Searching…
              </div>
            ) : candidates.length === 0 ? (
              <CommandEmpty className="px-4 py-6 text-xs text-muted-foreground text-center">
                No matching tickets
              </CommandEmpty>
            ) : (
              candidates.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.projectKey}-${r.ticketNumber} ${r.title}`}
                  onSelect={() => handleSelect(r)}
                  disabled={updateTicket.isPending}
                  className="mx-1 my-0.5 gap-2 px-2.5 py-2"
                >
                  <span className="shrink-0 font-mono text-micro text-muted-foreground">
                    {r.projectKey}-{r.ticketNumber}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {r.title}
                  </span>
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

export function TicketSubtasks({
  ticketId,
  projectId,
  subtasks,
  parentTicketId = null,
  canUseAI = false,
}: TicketSubtasksProps) {
  const canCreate = useCan("build:tickets:create");
  const canUpdate = useCan("build:tickets:update");
  const { data: projectData, isLoading: projectLoading } = useProject(projectId);
  const queryClient = useQueryClient();

  const projectKey = projectData?.key ?? null;
  const projectStatuses: ProjectStatusRecord[] = projectData?.statuses ?? [];

  const subtasksDone = subtasks.filter((s) => isCompletedTicketStatus(s.status, projectStatuses)).length;
  const subtasksTotal = subtasks.length;
  const subtaskProgress = subtasksTotal > 0 ? (subtasksDone / subtasksTotal) * 100 : 0;

  const excludeIds = useMemo(() => {
    const ids = new Set<number>(subtasks.map((s) => s.id));
    ids.add(ticketId);
    let ancestorId: number | null | undefined = parentTicketId;
    while (ancestorId != null && !ids.has(ancestorId)) {
      ids.add(ancestorId);
      const ancestor: Ticket | undefined = queryClient.getQueryData<Ticket>(
        buildWorkQueryKeys.projects.ticket(projectId, ancestorId),
      );
      ancestorId = ancestor?.parentTicketId;
    }
    return ids;
  }, [subtasks, ticketId, parentTicketId, queryClient, projectId]);

  return (
    <div className="pt-2">
      <div className="mb-3 flex w-full items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium">Subtasks</h4>
        {subtasksTotal > 0 && (
          <Badge variant="secondary" className="text-xs">
            {subtasksDone}/{subtasksTotal}
          </Badge>
        )}
        {canCreate ? (
          <TicketAiSuggestSubtasksAction
            projectId={projectId}
            ticketId={ticketId}
            canUseAI={canUseAI}
          />
        ) : null}
        {canUpdate ? (
          <ExistingTicketLinker
            ticketId={ticketId}
            projectId={projectId}
            excludeIds={excludeIds}
          />
        ) : null}
      </div>

      {subtasksTotal > 0 && (
        <Progress value={subtaskProgress} className="h-1.5 mb-3" />
      )}

      {projectLoading && subtasksTotal === 0 ? (
        <div className="space-y-1.5 mb-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : (
        <div className="space-y-1 mb-3">
          {subtasks.map((sub) => (
            <SubtaskRow
              key={sub.id}
              subtask={sub}
              projectId={projectId}
              projectKey={projectKey}
              projectStatuses={projectStatuses}
            />
          ))}
        </div>
      )}

      {canCreate ? (
        <SubtaskComposer
          ticketId={ticketId}
          projectId={projectId}
          projectStatuses={projectStatuses}
        />
      ) : null}
    </div>
  );
}
