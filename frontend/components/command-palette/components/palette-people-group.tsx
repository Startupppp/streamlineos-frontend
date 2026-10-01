"use client";

import { ArrowRight, UserRound } from "lucide-react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  PEOPLE_SEARCH_INTEGRITY_MESSAGE,
  type PalettePeopleSearch,
  type PalettePerson,
} from "../hooks/use-people-search";
import {
  COMMAND_ARROW_CLASS,
  COMMAND_GROUP_CLASS,
  COMMAND_ITEM_CLASS,
  ItemIcon,
} from "./palette-item";

function PalettePersonRow({
  person,
  onSelect,
}: {
  person: PalettePerson;
  onSelect: (href: string) => void;
}) {
  function handleSelect() {
    onSelect(person.href);
  }

  return (
    <CommandItem
      value={`${person.name} ${person.subtitle}`}
      onSelect={handleSelect}
      className={COMMAND_ITEM_CLASS}
    >
      <ItemIcon icon={UserRound} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-foreground">
          {person.name}
        </p>
        <p className="mt-0.5 truncate text-dense leading-tight text-muted-foreground">
          {person.subtitle}
        </p>
      </div>
      <ArrowRight className={COMMAND_ARROW_CLASS} />
    </CommandItem>
  );
}

export function PalettePeopleGroup({
  search,
  onSelect,
}: {
  search: PalettePeopleSearch;
  onSelect: (href: string) => void;
}) {
  const { people, canSearchPeople, isError } = search;
  const danger = statusToneClasses("danger");

  if (!canSearchPeople) return null;

  if (isError)
    return (
      <CommandGroup forceMount heading="People" className={COMMAND_GROUP_CLASS}>
        <p
          role="alert"
          className={cn(
            "mx-1 rounded-md border px-2 py-1.5 text-dense",
            danger.surface,
            danger.ink,
            danger.rule,
          )}
        >
          {PEOPLE_SEARCH_INTEGRITY_MESSAGE}
        </p>
      </CommandGroup>
    );

  if (people.length === 0) return null;

  return (
    <CommandGroup heading="People" className={COMMAND_GROUP_CLASS}>
      {people.map((person) => (
        <PalettePersonRow key={person.id} person={person} onSelect={onSelect} />
      ))}
    </CommandGroup>
  );
}
