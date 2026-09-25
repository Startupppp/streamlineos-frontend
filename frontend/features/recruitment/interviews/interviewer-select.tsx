"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarOrgMember } from "@/hooks/api/calendar";

interface InterviewerChipProps {
  member: CalendarOrgMember;
  onRemove: (id: string) => void;
}

function InterviewerChip({ member: m, onRemove }: InterviewerChipProps) {
  function handleClick() {
    onRemove(m.id);
  }
  return (
    <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/20">
      {m.name ?? m.email}
      <button
        type="button"
        onClick={handleClick}
        className="hover:text-destructive transition-colors duration-200 ml-0.5 rounded"
        aria-label={`Remove ${m.name ?? m.email}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

interface InterviewerCommandItemProps {
  member: CalendarOrgMember;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

function InterviewerCommandItem({
  member: m,
  isSelected,
  onToggle,
}: InterviewerCommandItemProps) {
  const label = m.name ?? m.email;
  function handleSelect() {
    onToggle(m.id);
  }
  return (
    <CommandItem
      key={m.id}
      value={`${label} ${m.email}`}
      onSelect={handleSelect}
    >
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0",
        )}
      />
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-muted-foreground">{m.role}</span>
      </div>
    </CommandItem>
  );
}

interface InterviewerSelectProps {
  orgMembers: CalendarOrgMember[] | undefined;
  selectedInterviewers: CalendarOrgMember[];
  interviewerIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (id: string) => void;
}

export function InterviewerSelect({
  orgMembers,
  selectedInterviewers,
  interviewerIds,
  open,
  onOpenChange,
  onToggle,
}: InterviewerSelectProps) {
  return (
    <div className="space-y-2">
      {selectedInterviewers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedInterviewers.map((m) => (
            <InterviewerChip key={m.id} member={m} onRemove={onToggle} />
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal text-muted-foreground gap-1.5"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add interviewer
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search members..." />
            <CommandList>
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup>
                {orgMembers?.map((m) => (
                  <InterviewerCommandItem
                    key={m.id}
                    member={m}
                    isSelected={interviewerIds.includes(m.id)}
                    onToggle={onToggle}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
