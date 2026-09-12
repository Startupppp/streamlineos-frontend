"use client";

import { useCallback } from "react";
import { ChevronDown, Search } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getInitials } from "@/lib/format-utils";
import { resolveImageUrl } from "@/lib/utils";
import type { SimulationCandidate } from "@/hooks/api/access/simulate";

interface SimulatePersonPickerProps {
  selected: SimulationCandidate | null;
  candidates: SimulationCandidate[];
  search: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelect: (candidate: SimulationCandidate) => void;
  onClear: () => void;
}

export function SimulatePersonPicker({
  selected,
  candidates,
  search,
  open,
  onOpenChange,
  onSearchChange,
  onSelect,
  onClear,
}: SimulatePersonPickerProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-9 w-full justify-between text-sm sm:w-[320px]"
            aria-label="Select a person to inspect"
          >
            {selected ? (
              <span className="flex min-w-0 items-center gap-2">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={resolveImageUrl(selected.image)} />
                  <AvatarFallback className="text-micro">
                    {getInitials(selected.name ?? selected.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">
                  {selected.name ?? selected.email}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Search className="h-4 w-4" />
                <span className="text-sm">Select a person…</span>
              </span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={onSearchChange}
              placeholder="Search members…"
            />
            <CommandList className="max-h-[240px]">
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup>
                {candidates.map((candidate) => (
                  <CandidateCommandItem
                    key={candidate.id}
                    candidate={candidate}
                    onSelect={onSelect}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected ? (
        <AnimatedIconButton
          icon={XIcon}
          iconSize={16}
          variant="ghost"
          size="icon"
          onClick={onClear}
          aria-label="Clear the selected person"
        />
      ) : null}
    </div>
  );
}

interface CandidateCommandItemProps {
  candidate: SimulationCandidate;
  onSelect: (candidate: SimulationCandidate) => void;
}

function CandidateCommandItem({
  candidate,
  onSelect,
}: CandidateCommandItemProps) {
  const handleSelect = useCallback(
    () => onSelect(candidate),
    [candidate, onSelect],
  );

  return (
    <CommandItem
      onSelect={handleSelect}
      className="flex cursor-pointer items-center gap-2"
    >
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={resolveImageUrl(candidate.image)} />
        <AvatarFallback className="text-micro">
          {getInitials(candidate.name ?? candidate.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm">{candidate.name ?? candidate.email}</p>
        {candidate.designation ? (
          <p className="truncate text-dense text-muted-foreground">
            {candidate.designation}
          </p>
        ) : null}
      </div>
    </CommandItem>
  );
}
