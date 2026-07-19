"use client";

import { useState, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn, resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket } from "@/hooks/api/projects/tickets";
import { useProjectMembers } from "@/hooks/api/projects/projects";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { PriorityBadge } from "../shared/priority-badge";
import { popoverOptionBaseClass, popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { StatusConfigDot } from "../shared/status-badge";
import { buildStatusConfig, getStatusEntry } from "../shared/types";
import type { TicketPriority } from "@/types/projects";
import { AlertTriangle, ArrowUp, Minus, ArrowDown, Check, User, Gauge } from "lucide-react";

const PRIORITIES: { value: TicketPriority; label: string; Icon: typeof Minus }[] = [
  { value: "URGENT", label: "Urgent", Icon: AlertTriangle },
  { value: "HIGH", label: "High", Icon: ArrowUp },
  { value: "MEDIUM", label: "Medium", Icon: Minus },
  { value: "LOW", label: "Low", Icon: ArrowDown },
];

interface InlineFieldWrapperProps {
  children: React.ReactNode;
}

export function stopEvent(e: React.MouseEvent | React.KeyboardEvent) {
  e.stopPropagation();
}

export function InlineFieldWrapper({ children }: InlineFieldWrapperProps) {
  return (
    <span onMouseDown={stopEvent} onClick={stopEvent}>
      {children}
    </span>
  );
}

interface InlinePriorityProps {
  ticketId: number;
  projectId: number;
  currentPriority?: string | null;
}

export const InlinePriority = memo(function InlinePriority({
  ticketId,
  projectId,
  currentPriority,
}: InlinePriorityProps) {
  const [open, setOpen] = useState(false);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function makePriorityHandler(priority: TicketPriority) {
    return function selectPriority() {
      updateTicket.mutate({ ticketId, priority });
      setOpen(false);
    };
  }

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex rounded p-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Change priority"
          >
            <PriorityBadge priority={currentPriority} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1" align="start">
          {PRIORITIES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={makePriorityHandler(value)}
              className={cn(
                popoverOptionBaseClass,
                currentPriority === value && popoverOptionSelectedClass,
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
              {currentPriority === value && <Check className="ml-auto h-3 w-3" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

interface InlineAssigneeProps {
  ticketId: number;
  projectId: number;
  currentAssigneeId?: string | null;
  assignee?: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
  } | null;
}

export const InlineAssignee = memo(function InlineAssignee({
  ticketId,
  projectId,
  currentAssigneeId,
  assignee,
}: InlineAssigneeProps) {
  const [open, setOpen] = useState(false);
  const { data: members = [] } = useProjectMembers(projectId);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function makeAssigneeHandler(userId: string | null) {
    return function selectAssignee() {
      if (userId === null) {
        updateTicket.mutate({ ticketId, assigneeIds: [] });
      } else {
        updateTicket.mutate({ ticketId, assigneeId: userId });
      }
      setOpen(false);
    };
  }

  const trigger = assignee ? (
    <Avatar className="h-5 w-5 border border-background shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
      <AvatarImage src={resolveImageUrl(assignee.image)} />
      <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-medium">
        {getUserInitials(assignee)}
      </AvatarFallback>
    </Avatar>
  ) : (
    <div className="h-5 w-5 rounded-full bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 cursor-pointer hover:border-muted-foreground/60 transition-colors">
      <span className="text-[7px] text-muted-foreground">?</span>
    </div>
  );

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Change assignee">
            {trigger}
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
                  {!currentAssigneeId && <Check className="ml-auto h-3 w-3" />}
                </CommandItem>
                {members.map((m) => (
                  <CommandItem key={m.id} value={getUserDisplayName(m)} onSelect={makeAssigneeHandler(m.id)}>
                    <Avatar className="mr-2 h-5 w-5 shrink-0">
                      <AvatarImage src={resolveImageUrl(m.image)} />
                      <AvatarFallback className="text-[7px]">{getUserInitials(m)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-left text-xs">{getUserDisplayName(m)}</span>
                    {m.id === currentAssigneeId && <Check className="ml-auto h-3 w-3 shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

interface InlineEstimateProps {
  ticketId: number;
  projectId: number;
  currentPoints?: number | null;
}

export const InlineEstimate = memo(function InlineEstimate({
  ticketId,
  projectId,
  currentPoints,
}: InlineEstimateProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentPoints != null ? String(currentPoints) : "");
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpen(next: boolean) {
    if (next) setValue(currentPoints != null ? String(currentPoints) : "");
    setOpen(next);
  }

  function handleSubmit() {
    const parsed = value.trim() === "" ? null : parseInt(value, 10);
    if (value.trim() !== "" && (Number.isNaN(parsed) || (parsed !== null && parsed < 0))) return;
    updateTicket.mutate({ ticketId, points: parsed ?? undefined });
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") setOpen(false);
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  const display = currentPoints != null && currentPoints > 0 ? currentPoints : null;

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Change estimate"
          >
            <Gauge
              className={cn(
                "h-3 w-3 shrink-0",
                display != null ? "text-foreground" : "text-muted-foreground/50",
              )}
            />
            <span
              className={cn(
                "text-[10px] font-mono",
                display != null ? "text-foreground" : "text-muted-foreground/50",
              )}
            >
              {display != null ? `${display} pts` : "pts"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-28 p-2" align="start">
          <Input
            autoFocus
            type="number"
            min={0}
            placeholder="Points"
            value={value}
            onChange={handleValueChange}
            onKeyDown={handleKeyDown}
            className="text-xs"
          />
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

interface InlineStatusProps {
  ticketId: number;
  projectId: number;
  currentStatus: string;
  projectStatuses?: Array<{ name: string; color: string | null; type?: string | null }>;
}

export const InlineStatus = memo(function InlineStatus({
  ticketId,
  projectId,
  currentStatus,
  projectStatuses,
}: InlineStatusProps) {
  const [open, setOpen] = useState(false);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const resolvedConfig =
    projectStatuses && projectStatuses.length > 0
      ? buildStatusConfig(projectStatuses)
      : buildStatusConfig([]);

  const statusList =
    projectStatuses && projectStatuses.length > 0
      ? projectStatuses.map((s) => s.name)
      : ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

  function makeStatusHandler(status: string) {
    return function selectStatus() {
      updateTicket.mutate({ ticketId, status });
      setOpen(false);
    };
  }

  const currentEntry = getStatusEntry(resolvedConfig, currentStatus);

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Change status"
          >
            <StatusConfigDot entry={currentEntry} className="h-1.5 w-1.5 rounded-full shrink-0" />
            <span className="text-[10px] text-muted-foreground">{currentEntry.label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          {statusList.map((status) => {
            const entry = getStatusEntry(resolvedConfig, status);
            return (
              <button
                key={status}
                type="button"
                onClick={makeStatusHandler(status)}
                className={cn(
                  popoverOptionBaseClass,
                  status === currentStatus && popoverOptionSelectedClass,
                )}
              >
                <StatusConfigDot entry={entry} />
                {entry.label}
                {status === currentStatus && <Check className="ml-auto h-3 w-3" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

interface InlineTitleProps {
  ticketId: number;
  projectId: number;
  currentTitle: string;
  className?: string;
}

export const InlineTitle = memo(function InlineTitle({
  ticketId,
  projectId,
  currentTitle,
  className,
}: InlineTitleProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentTitle);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpen(next: boolean) {
    if (next) setValue(currentTitle);
    setOpen(next);
  }

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed === currentTitle) {
      setOpen(false);
      return;
    }
    updateTicket.mutate({ ticketId, title: trimmed }, { onSuccess: () => setOpen(false) });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "min-w-0 max-w-full truncate text-left text-sm font-semibold transition-colors hover:text-primary [overflow-wrap:anywhere]",
              className,
            )}
            aria-label="Edit title"
            title={currentTitle}
          >
            {currentTitle}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            autoFocus
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="text-sm"
            placeholder="Title"
          />
          <LoadingButton
            size="sm"
            className="mt-2 w-full"
            isPending={updateTicket.isPending}
            loadingText="Saving…"
            onClick={handleSave}
            disabled={value.trim().length < 1}
          >
            Save
          </LoadingButton>
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

interface InlineDescriptionProps {
  ticketId: number;
  projectId: number;
  currentDescription: string | null;
}

export const InlineDescription = memo(function InlineDescription({
  ticketId,
  projectId,
  currentDescription,
}: InlineDescriptionProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentDescription ?? "");
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpen(next: boolean) {
    if (next) setValue(currentDescription ?? "");
    setOpen(next);
  }

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed === (currentDescription ?? "")) {
      setOpen(false);
      return;
    }
    updateTicket.mutate(
      { ticketId, description: trimmed || undefined },
      { onSuccess: () => setOpen(false) },
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
  }

  const preview = currentDescription?.trim();

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "line-clamp-1 text-left text-xs transition-colors",
              preview ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground",
            )}
            aria-label="Edit description"
          >
            {preview || "Add description…"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <Textarea
            autoFocus
            value={value}
            onChange={handleChange}
            placeholder="Description"
            className="min-h-[72px] resize-none text-xs"
            rows={3}
          />
          <LoadingButton
            size="sm"
            className="mt-2 w-full"
            isPending={updateTicket.isPending}
            loadingText="Saving…"
            onClick={handleSave}
          >
            Save
          </LoadingButton>
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});
