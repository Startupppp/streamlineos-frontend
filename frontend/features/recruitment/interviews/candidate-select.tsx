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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CandidateSummary {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface CandidateCommandItemProps {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  activeCandidateId: string;
  onSelect: (idStr: string) => void;
}

function CandidateCommandItem({
  id,
  firstName,
  lastName,
  email,
  activeCandidateId,
  onSelect,
}: CandidateCommandItemProps) {
  const label = `${firstName} ${lastName}`.trim();
  const idStr = String(id);
  function handleSelect() {
    onSelect(idStr);
  }
  return (
    <CommandItem value={`${label} ${email ?? ""}`} onSelect={handleSelect}>
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          activeCandidateId === idStr ? "opacity-100" : "opacity-0",
        )}
      />
      <span className="truncate">{label}</span>
    </CommandItem>
  );
}

interface CandidateSelectProps {
  candidates: CandidateSummary[] | undefined;
  candidateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (idStr: string) => void;
}

export function CandidateSelect({
  candidates,
  candidateId,
  open,
  onOpenChange,
  onSelect,
}: CandidateSelectProps) {
  const selected = candidates?.find((c) => String(c.id) === candidateId);
  const displayLabel = selected
    ? `${selected.firstName ?? ""} ${selected.lastName ?? ""}`.trim()
    : "Select candidate";

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-sm">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search candidates..." />
          <CommandList>
            <CommandEmpty>No candidate found.</CommandEmpty>
            <CommandGroup>
              {candidates?.map((c) => (
                <CandidateCommandItem
                  key={c.id}
                  id={c.id}
                  firstName={c.firstName ?? ""}
                  lastName={c.lastName ?? ""}
                  email={c.email ?? null}
                  activeCandidateId={candidateId}
                  onSelect={onSelect}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
