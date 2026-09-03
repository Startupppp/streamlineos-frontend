"use client";

import {
  CommandPaletteContext,
  useCommandPaletteState,
} from "../hooks/use-command-palette";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { ShortcutsHelpDialog } from "./shortcuts-help-dialog";

interface Props {
  children: React.ReactNode;
  createTicketDialog?: React.ReactNode;
}

function KeyboardShortcutsRegistrar() {
  useKeyboardShortcuts();
  return null;
}

export function CommandPaletteProvider({ children, createTicketDialog }: Props) {
  const state = useCommandPaletteState();

  return (
    <CommandPaletteContext.Provider value={state}>
      <KeyboardShortcutsRegistrar />
      <ShortcutsHelpDialog />
      {createTicketDialog}
      {children}
    </CommandPaletteContext.Provider>
  );
}
