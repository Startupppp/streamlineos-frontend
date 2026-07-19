"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, User } from "lucide-react";
import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useCreateTicket } from "@/hooks/api";
import { useProjectMembers } from "@/hooks/api/projects/projects";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PriorityBadge } from "../shared/priority-badge";
import { popoverOptionBaseClass, popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { StatusConfigDot } from "../shared/status-badge";
import { buildStatusConfig, getStatusEntry } from "../shared/types";
import { getUserDisplayName, getUserInitials } from "../shared/resolve-user-name";
import type { TicketPriority } from "@/types/projects";
import type { ProjectStatusRecord } from "@/types/projects";

const PRIORITIES: { value: TicketPriority; label: string; Icon: typeof Minus }[] = [
  { value: "URGENT", label: "Urgent", Icon: AlertTriangle },
  { value: "HIGH", label: "High", Icon: ArrowUp },
  { value: "MEDIUM", label: "Medium", Icon: Minus },
  { value: "LOW", label: "Low", Icon: ArrowDown },
];

interface SubtaskComposerProps {
  ticketId: number;
  projectId: number;
  projectStatuses: ProjectStatusRecord[];
}

export function SubtaskComposer({ ticketId, projectId, projectStatuses }: SubtaskComposerProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TicketPriority | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  const { data: members = [] } = useProjectMembers(projectId);

  const resolvedConfig =
    projectStatuses.length > 0 ? buildStatusConfig(projectStatuses) : buildStatusConfig([]);

  const statusList =
    projectStatuses.length > 0
      ? projectStatuses.map((s) => s.name)
      : ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

  const subtaskQueryKey = [...queryKeys.projects.all, "subtasks", { ticketId }];

  const createSubtask = useCreateTicket({
    onSuccess: () => {
      setTitle("");
      setAssigneeId(null);
      setPriority(null);
      setStatus(null);
      queryClient.invalidateQueries({ queryKey: subtaskQueryKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.ticket(ticketId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      inputRef.current?.focus();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function handleCreate() {
    if (!title.trim()) return;
    createSubtask.mutate({
      projectId,
      title: title.trim(),
      type: "TASK",
      parentTicketId: ticketId,
      ...(assigneeId ? { assigneeId } : {}),
      ...(priority ? { priority } : {}),
      ...(status ? { status } : {}),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleCreate();
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }

  const selectedMember = assigneeId
    ? members.find((m) => m.id === assigneeId) ?? null
    : null;

  const currentStatusEntry = status ? getStatusEntry(resolvedConfig, status) : null;

  function makePriorityHandler(p: TicketPriority) {
    return function selectPriority() {
      setPriority(p);
      setPriorityOpen(false);
    };
  }

  function makeStatusHandler(s: string) {
    return function selectStatus() {
      setStatus(s);
      setStatusOpen(false);
    };
  }

  function makeAssigneeHandler(userId: string | null) {
    return function selectAssignee() {
      setAssigneeId(userId);
      setAssigneeOpen(false);
    };
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/20 px-2 py-1.5">
      <Popover open={statusOpen} onOpenChange={setStatusOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors shrink-0"
            aria-label="Set status"
          >
            {currentStatusEntry ? (
              <>
                <StatusConfigDot
                  entry={currentStatusEntry}
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                />
                <span className="text-[10px] text-muted-foreground">{currentStatusEntry.label}</span>
              </>
            ) : (
              <span className="h-2 w-2 rounded-full border border-dashed border-muted-foreground/40 shrink-0" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          {statusList.map((s) => {
            const entry = getStatusEntry(resolvedConfig, s);
            return (
              <button
                key={s}
                type="button"
                onClick={makeStatusHandler(s)}
                className={cn(
                  popoverOptionBaseClass,
                  status === s && popoverOptionSelectedClass,
                )}
              >
                <StatusConfigDot entry={entry} />
                {entry.label}
                {status === s && <Check className="ml-auto h-3 w-3" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      <Input
        ref={inputRef}
        value={title}
        onChange={handleTitleChange}
        placeholder="Add subtask..."
        className="h-6 flex-1 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        onKeyDown={handleKeyDown}
      />

      <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex rounded p-0.5 hover:bg-muted/60 transition-colors shrink-0"
            aria-label="Set priority"
          >
            <PriorityBadge priority={priority} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1" align="end">
          {PRIORITIES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={makePriorityHandler(value)}
              className={cn(
                popoverOptionBaseClass,
                priority === value && popoverOptionSelectedClass,
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
              {priority === value && <Check className="ml-auto h-3 w-3" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Set assignee" className="shrink-0">
            {selectedMember ? (
              <Avatar className="h-5 w-5 border border-background cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-medium">
                  {getUserInitials(selectedMember)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-muted-foreground/60 transition-colors">
                <User className="h-2.5 w-2.5 text-muted-foreground/60" />
              </div>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0" align="end">
          <Command>
            <CommandInput placeholder="Search members..." className="text-xs" />
            <CommandList className="max-h-48">
              <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">No members found.</CommandEmpty>
              <CommandGroup>
                <CommandItem value="__unassigned__" onSelect={makeAssigneeHandler(null)}>
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-xs">Unassigned</span>
                  {!assigneeId && <Check className="ml-auto h-3 w-3" />}
                </CommandItem>
                {members.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={getUserDisplayName(m)}
                    onSelect={makeAssigneeHandler(m.id)}
                  >
                    <Avatar className="mr-2 h-5 w-5 shrink-0">
                      <AvatarImage src={resolveImageUrl(m.image)} />
                      <AvatarFallback className="text-[7px]">{getUserInitials(m)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs">{getUserDisplayName(m)}</span>
                    {m.id === assigneeId && <Check className="ml-auto h-3 w-3" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AnimatedIconButton
        size="sm"
        icon={PlusIcon}
        iconSize={12}
        className="h-6 w-6 shrink-0 p-0"
        onClick={handleCreate}
        disabled={!title.trim() || createSubtask.isPending}
        aria-label="Create subtask"
      />
    </div>
  );
}
