"use client";

import {
  CommandPaletteContext,
  useCommandPaletteState,
} from "../hooks/use-command-palette";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { ShortcutsHelpDialog } from "./shortcuts-help-dialog";
import { GlobalCreateTicketDialog } from "./global-create-ticket-dialog";

interface Props {
  children: React.ReactNode;
}

function KeyboardShortcutsRegistrar() {
  useKeyboardShortcuts();
  return null;
}

export function CommandPaletteProvider({ children }: Props) {
  const state = useCommandPaletteState();

  return (
    <CommandPaletteContext.Provider value={state}>
      <KeyboardShortcutsRegistrar />
      <ShortcutsHelpDialog />
      <GlobalCreateTicketDialog />
      {children}
    </CommandPaletteContext.Provider>
  );
}
