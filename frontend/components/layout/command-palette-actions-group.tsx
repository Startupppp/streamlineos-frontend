"use client";

import { useCallback, useState } from "react";
import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import {
  COMMAND_GROUP_CLASS,
  COMMAND_ITEM_CLASS,
  COMMAND_SHORTCUT_CLASS,
  ItemIcon,
} from "@/components/command-palette/components/palette-item";
import type { CommandPaletteCommand } from "./command-palette-command-types";

interface ActionItemProps {
  command: CommandPaletteCommand;
  armed: boolean;
  onArm: (id: string | null) => void;
  onConfirmed: () => void;
}

function ActionItem({ command, armed, onArm, onConfirmed }: ActionItemProps) {
  const handleSelect = useCallback(() => {
    if (command.confirm && !armed) {
      onArm(command.id);
      return;
    }
    onArm(null);
    void command.execute();
    if (command.confirm) onConfirmed();
  }, [command, armed, onArm, onConfirmed]);

  return (
    <CommandItem
      value={`${command.label} ${command.keywords.join(" ")}`}
      onSelect={handleSelect}
      className={COMMAND_ITEM_CLASS}
      aria-describedby={armed ? `${command.id}-confirm` : undefined}
    >
      <ItemIcon icon={command.icon} />
      <span className="flex-1 text-sm text-foreground">{command.label}</span>
      {armed ? (
        <span id={`${command.id}-confirm`} className="text-dense font-medium text-primary">
          Press Enter again to confirm
        </span>
      ) : command.shortcut ? (
        <CommandShortcut className={COMMAND_SHORTCUT_CLASS}>{command.shortcut}</CommandShortcut>
      ) : null}
    </CommandItem>
  );
}

interface CommandPaletteActionsGroupProps {
  commands: CommandPaletteCommand[];
  onConfirmed: () => void;
}

export function CommandPaletteActionsGroup({
  commands,
  onConfirmed,
}: CommandPaletteActionsGroupProps) {
  const [armedId, setArmedId] = useState<string | null>(null);

  return (
    <CommandGroup heading="Actions" className={COMMAND_GROUP_CLASS}>
      {commands.map((command) => (
        <ActionItem
          key={command.id}
          command={command}
          armed={armedId === command.id}
          onArm={setArmedId}
          onConfirmed={onConfirmed}
        />
      ))}
    </CommandGroup>
  );
}
