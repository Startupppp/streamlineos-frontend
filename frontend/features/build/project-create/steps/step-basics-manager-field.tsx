"use client";

import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormControl } from "@/components/ui/form";
import { Check, ChevronDown, User } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useSimpleClientsList } from "@/hooks/api/crm/clients";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { useWizardMembers, useWizardSessionUser } from "../use-wizard-members";
import { findWizardMember } from "../resolve-wizard-member-label";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

const NONE_SENTINEL = "__none__";

export function charCounter(current: string | undefined, max: number) {
  const len = (current ?? "").length;
  const near = len >= Math.floor(max * 0.85);
  const over = len > max;
  if (!near && !over) return null;
  return (
    <span className={over ? "text-destructive" : "text-muted-foreground"}>
      {len}/{max}
    </span>
  );
}

interface BasicsManagerFieldProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function BasicsManagerField({
  value,
  onChange,
}: BasicsManagerFieldProps) {
  const sessionUser = useWizardSessionUser();
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState("");
  const debouncedManagerSearch = useDebouncedValue(managerSearch, 300).trim();
  const members = useWizardMembers(100, debouncedManagerSearch || undefined);

  const selectedManager = value
    ? members.find((m) => m.userId === value)
    : null;
  const selectedPerson = findWizardMember(value, members, sessionUser);

  function handleSelect(selected: string) {
    onChange(selected === NONE_SENTINEL ? undefined : selected);
    setManagerOpen(false);
    setManagerSearch("");
  }

  function handleSearchChange(v: string) {
    setManagerSearch(v);
  }

  return (
    <ResponsivePopover open={managerOpen} onOpenChange={setManagerOpen}>
      <ResponsivePopoverTrigger asChild>
        <FormControl>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-label="Select project manager"
            className={cn(
              "h-9 w-full justify-between gap-2 font-normal",
              !selectedPerson && "text-muted-foreground",
            )}
          >
            {selectedPerson ? (
              <span className="flex items-center gap-2 min-w-0">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage
                    src={resolveImageUrl(selectedManager?.image ?? null)}
                  />
                  <AvatarFallback className="text-micro">
                    {getUserInitials(selectedPerson)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate text-sm">
                  {getUserDisplayName(selectedPerson)}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0" />
                <span>No manager</span>
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </FormControl>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="Project Manager"
        className="min-w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email…"
            className="text-xs"
            value={managerSearch}
            onValueChange={handleSearchChange}
          />
          <CommandList className="max-h-52">
            <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
              No members found.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={NONE_SENTINEL}
                onSelect={() => handleSelect(NONE_SENTINEL)}
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-xs">No manager</span>
                {!value && <Check className="ml-auto h-3 w-3" />}
              </CommandItem>
              {members.map((m) => (
                <CommandItem
                  key={m.userId}
                  value={m.userId}
                  onSelect={() => handleSelect(m.userId)}
                >
                  <Avatar className="mr-2 h-5 w-5 shrink-0">
                    <AvatarImage src={resolveImageUrl(m.image)} />
                    <AvatarFallback className="text-micro">
                      {getUserInitials({ name: m.name, email: m.email })}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <span className="truncate text-xs block">
                      {getUserDisplayName({ name: m.name, email: m.email })}
                    </span>
                    {m.name && (
                      <span className="truncate text-micro text-muted-foreground block">
                        {m.email}
                      </span>
                    )}
                  </div>
                  {m.userId === value && (
                    <Check className="ml-auto h-3 w-3 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

interface BasicsClientFieldProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function BasicsClientField({ value, onChange }: BasicsClientFieldProps) {
  const { data: clients } = useSimpleClientsList();
  const clientList = clients ?? [];

  function handleChange(selected: string) {
    onChange(selected === NONE_SENTINEL ? undefined : selected);
  }

  return (
    <Select value={value || NONE_SENTINEL} onValueChange={handleChange}>
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder="Select client…" />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectItem value={NONE_SENTINEL}>No client</SelectItem>
        {clientList.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.name ?? "(unnamed)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
